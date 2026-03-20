// api/stripe-webhook.js
// Obsługuje pełny cykl życia subskrypcji Stripe:
//   checkout.session.completed      → nowy klient, token, email
//   invoice.payment_succeeded       → odnowienie (logowanie)
//   customer.subscription.deleted   → anulowanie → active = false
//   invoice.payment_failed          → nieudana płatność → active = false

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";


// Fakturownia — wystawia fakturę i wysyła do KSeF
async function createFakturowniaInvoice({ customerEmail, customerName, customerNip, productName, grossAmount }) {
  const domain = process.env.FAKTUROWNIA_DOMAIN;
  const apiToken = process.env.FAKTUROWNIA_API_TOKEN;

  const today = new Date().toISOString().split("T")[0];
  const paymentTo = today; // płatność pobrana natychmiast przez Stripe
  const isCompany = !!customerNip;

  const invoiceData = {
    api_token: apiToken,
    invoice: {
      kind: "vat",
      number: null,
      sell_date: today,
      issue_date: today,
      payment_to: paymentTo,
      seller_name: "Inżynieria Wodna DO-KOP Dominik Witkowski",
      seller_tax_no: "7393960834",
      seller_post_code: "11-510",
      seller_city: "Krzywe",
      seller_street: "Krzywe 1/2",
      buyer_name: customerName || customerEmail,
      buyer_email: customerEmail,
      buyer_tax_no: customerNip || "",
      buyer_company: isCompany,
      currency: "PLN",
      status: "paid",
      payment_type: "karta",
      positions: [
        {
          name: productName,
          quantity: 1,
          total_price_gross: grossAmount,
          tax: 23,
        }
      ],
    }
  };

  const response = await fetch(`https://${domain}.fakturownia.pl/invoices.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoiceData),
  });

  const data = await response.json();
  if (data.code === "error") {
    console.error("Fakturownia error:", data);
    throw new Error(`Fakturownia error: ${JSON.stringify(data)}`);
  }

  console.log(`🧾 Faktura wystawiona: ${data.number} dla ${customerEmail}`);

  // Wyślij fakturę emailem do klienta (osobne wywołanie API)
  if (data.id) {
    const emailResponse = await fetch(
      `https://${domain}.fakturownia.pl/invoices/${data.id}/send_by_email.json?api_token=${apiToken}`,
      { method: "POST" }
    );
    if (emailResponse.ok) {
      console.log(`📧 Faktura wysłana emailem do ${customerEmail}`);
    } else {
      console.warn(`⚠️ Faktura wystawiona ale email nie wysłany dla ${customerEmail}`);
    }
  }

  return data;
}

export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Uzupełnij swoimi Price ID ze Stripe → Products
const PRICE_TO_PLAN = {
  "price_1TClC6GtCsuxySf2tb7iZgtK": "solo",   // 39 zł/mies
  "price_1TClExGtCsuxySf26vdYhCWh": "small",  // 89 zł/mies
  "price_1TClFaGtCsuxySf2mqiQsQDM": "firma",  // 199 zł/mies
};

const RESET_PRICE_ID = "price_1TClGGGtCsuxySf2AL3pCKqB"; // 29 zł jednorazowy reset

const PLAN_NAMES = {
  solo:  "Solo (39 zł/mies.)",
  small: "Mała firma (89 zł/mies.)",
  firma: "Firma (199 zł/mies.)",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Weryfikacja podpisu Stripe
  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Błąd weryfikacji webhooka:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  console.log(`📨 Stripe event: ${event.type}`);

  // ─────────────────────────────────────────────────────────────
  // 1. CHECKOUT — subskrypcja lub jednorazowy reset
  // ─────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // ── JEDNORAZOWY RESET LIMITU ──
    if (session.mode === "payment") {
      const customerEmail = session.customer_details?.email;
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      if (priceId === RESET_PRICE_ID && customerEmail) {
        const { data: tokens } = await supabase
          .from("paid_tokens")
          .select("token")
          .eq("email", customerEmail)
          .eq("active", true);

        if (tokens && tokens.length > 0) {
          await supabase
            .from("paid_tokens")
            .update({ monthly_count: 0, count_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
            .eq("email", customerEmail)
            .eq("active", true);

          await resend.emails.send({
            from: "Głowa do KSeF <noreply@glowadoksef.pl>",
            to: customerEmail,
            subject: "Limit wiadomości zresetowany — KSeF Asystent",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Limit wiadomości został zresetowany!</h2>
                <p>Twój miesięczny limit wiadomości został wyzerowany. Możesz teraz korzystać z asystenta bez ograniczeń do końca nowego cyklu.</p>
                <a href="https://glowadoksef.pl"
                   style="display:inline-block; background:#4f46e5; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; margin-top:12px;">
                  Wróć do Głowa do KSeF
                </a>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  Pytania: <a href="mailto:dominowit@gmail.com">dominowit@gmail.com</a>
                </p>
              </div>
            `,
          }).catch(err => console.error("Błąd emaila reset:", err.message));

          const resetCustomerName = session.customer_details?.name || "";
          const resetCustomerNip = session.customer_details?.tax_ids?.[0]?.value || "";
          try {
            await createFakturowniaInvoice({
              customerEmail,
              customerName: resetCustomerName,
              customerNip: resetCustomerNip,
              productName: "KSeF Asystent — Reset limitu wiadomości",
              grossAmount: 29,
            });
          } catch (err) {
            console.error("Błąd Fakturowni (reset):", err.message);
          }

          console.log(`🔄 Reset limitu dla ${customerEmail}`);
          return res.status(200).json({ received: true, reset: true });
        }

        console.warn(`⚠️ Nie znaleziono aktywnego tokenu dla ${customerEmail}`);
        return res.status(200).json({ received: true, reset: false, reason: "no active token" });
      }

      return res.status(200).json({ received: true, skipped: "unknown payment" });
    }

    // ── NOWA SUBSKRYPCJA ──
    if (session.mode !== "subscription") {
      return res.status(200).json({ received: true, skipped: "not subscription" });
    }

    const customerEmail = session.customer_details?.email;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    if (!customerEmail) {
      console.error("Brak emaila w sesji:", session.id);
      return res.status(400).json({ error: "Brak emaila klienta" });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = PRICE_TO_PLAN[priceId] || "solo";
    const token = crypto.randomBytes(6).toString("hex").toUpperCase();

    const { error: dbError } = await supabase.from("paid_tokens").insert({
      token,
      email: customerEmail,
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      active: true,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Błąd zapisu do Supabase:", dbError);
      return res.status(500).json({ error: "Błąd bazy danych" });
    }

    try {
      await resend.emails.send({
        from: "Głowa do KSeF <noreply@glowadoksef.pl>",
        to: customerEmail,
        subject: "Twój token dostępu — KSeF Asystent",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Dziękujemy za subskrypcję!</h2>
            <p>Twój plan: <strong>${PLAN_NAMES[plan]}</strong></p>
            <div style="background: #f0f4ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0 0 8px; color: #666;">Twój token dostępu:</p>
              <code style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #2563eb;">
                ${token}
              </code>
            </div>
            <p>Jak użyć tokenu:</p>
            <ol>
              <li>Otwórz <a href="https://glowadoksef.pl">Głowa do KSeF</a></li>
              <li>Kliknij przycisk "🔑 Mam token"</li>
              <li>Wpisz powyższy kod</li>
            </ol>
            <p>Token jest ważny przez cały okres subskrypcji i odnawia się automatycznie.</p>
            <p style="color: #666; font-size: 14px;">
              Pytania: <a href="mailto:dominowit@gmail.com">dominowit@gmail.com</a>
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      // Email nie wysłany — token jest w Supabase, można wysłać ręcznie
      // Powiadom siebie o problemie
      console.error(`⚠️ Email NIE wysłany dla ${customerEmail} (token: ${token}):`, emailErr.message);
      await resend.emails.send({
        from: "Głowa do KSeF <noreply@glowadoksef.pl>",
        to: "dominowit@gmail.com",
        subject: `⚠️ Błąd wysyłki tokenu dla ${customerEmail}`,
        html: `<p>Token <strong>${token}</strong> dla ${customerEmail} (plan: ${plan}) nie został wysłany z powodu błędu. Wyślij ręcznie.</p>`,
      }).catch(() => {});
    }

    // Wystaw fakturę w Fakturowni
    const customerName = session.customer_details?.name || "";
    const customerNip = session.customer_details?.tax_ids?.[0]?.value || "";
    const planPrices = { solo: 39, small: 89, firma: 199 };
    try {
      await createFakturowniaInvoice({
        customerEmail,
        customerName,
        customerNip,
        productName: `KSeF Asystent — ${PLAN_NAMES[plan]}`,
        grossAmount: planPrices[plan] || 39,
      });
    } catch (err) {
      console.error("Błąd Fakturowni (subskrypcja):", err.message);
      // Nie blokuj — token już wystawiony, faktura może być wystawiona ręcznie
    }

    console.log(`✅ Nowa subskrypcja: token ${token} dla ${customerEmail} (${plan})`);
    return res.status(200).json({ received: true, token, plan });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ANULOWANIE SUBSKRYPCJI — dezaktywuj token
  // ─────────────────────────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer;

    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail = customer.email;

    await supabase
      .from("paid_tokens")
      .update({ active: false, cancelled_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscriptionId);

    if (customerEmail) {
      await resend.emails.send({
        from: "Głowa do KSeF <noreply@glowadoksef.pl>",
        to: customerEmail,
        subject: "Subskrypcja anulowana — KSeF Asystent",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Subskrypcja została anulowana</h2>
            <p>Twój dostęp do KSeF Asystenta wygasł.</p>
            <p>Jeśli chcesz wznowić subskrypcję:</p>
            <a href="https://ksef-asystent.vercel.app"
               style="display:inline-block; background:#2563eb; color:white;
                      padding:12px 24px; border-radius:6px; text-decoration:none;">
              Wróć do KSeF Asystenta
            </a>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              Pytania: <a href="mailto:dominowit@gmail.com">dominowit@gmail.com</a>
            </p>
          </div>
        `,
      });
    }

    console.log(`❌ Anulowano subskrypcję ${subscriptionId}`);
    return res.status(200).json({ received: true, cancelled: true });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. NIEUDANA PŁATNOŚĆ — dezaktywuj po wyczerpaniu prób
  // ─────────────────────────────────────────────────────────────
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const attemptCount = invoice.attempt_count;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Dezaktywuj dopiero gdy Stripe oznaczy subskrypcję jako "unpaid"
    // lub gdy minęły wszystkie próby (domyślnie 4 w Stripe)
    if (subscription.status === "unpaid" || attemptCount >= 4) {
      await supabase
        .from("paid_tokens")
        .update({ active: false, cancelled_at: new Date().toISOString() })
        .eq("stripe_subscription_id", subscriptionId);

      console.log(`⚠️ Dezaktywowano token po nieudanych płatnościach (${subscriptionId})`);
    } else {
      console.log(`⚠️ Nieudana płatność #${attemptCount} dla ${subscriptionId} — token dalej aktywny`);
    }

    return res.status(200).json({ received: true, attempt: attemptCount });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. ODNOWIENIE — wystaw fakturę za kolejny miesiąc
  // ─────────────────────────────────────────────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;

    if (invoice.billing_reason === "subscription_cycle") {
      console.log(`🔄 Odnowiono subskrypcję ${invoice.subscription}`);

      const customerEmail = invoice.customer_email;
      const grossAmount = Math.round(invoice.amount_paid / 100);

      if (customerEmail && grossAmount > 0) {
        // Pobierz dane klienta z Supabase żeby mieć aktualny plan i NIP
        const { data: tokenData } = await supabase
          .from("paid_tokens")
          .select("plan, email")
          .eq("stripe_subscription_id", invoice.subscription)
          .eq("active", true)
          .single();

        const plan = tokenData?.plan || "solo";
        const customerNip = invoice.customer_tax_ids?.[0]?.value || "";
        const customerName = invoice.customer_name || "";

        try {
          await createFakturowniaInvoice({
            customerEmail,
            customerName,
            customerNip,
            productName: `KSeF Asystent — ${PLAN_NAMES[plan] || "Odnowienie subskrypcji"}`,
            grossAmount,
          });
        } catch (err) {
          console.error("Błąd Fakturowni (odnowienie):", err.message);
        }
      }
    }

    return res.status(200).json({ received: true, renewed: true });
  }

  return res.status(200).json({ received: true, skipped: true });
}
