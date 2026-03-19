// api/stripe-webhook.js
// Obsługuje pełny cykl życia subskrypcji Stripe:
//   checkout.session.completed      → nowy klient, token, email
//   invoice.payment_succeeded       → odnowienie (logowanie)
//   customer.subscription.deleted   → anulowanie → active = false
//   invoice.payment_failed          → nieudana płatność → active = false

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";


// Fakturownia — wystawia fakturę i wysyła do KSeF
async function createFakturowniaInvoice({ customerEmail, customerName, customerNip, productName, grossAmount }) {
  const domain = process.env.FAKTUROWNIA_DOMAIN;
  const apiToken = process.env.FAKTUROWNIA_API_TOKEN;

  // Oblicz netto i VAT z kwoty brutto (23%)
  const vatRate = 0.23;
  const netAmount = Math.round((grossAmount / 1.23) * 100) / 100;
  const vatAmount = Math.round((grossAmount - netAmount) * 100) / 100;

  const invoiceData = {
    api_token: apiToken,
    invoice: {
      kind: "vat",
      number: null, // Fakturownia nada automatycznie
      sell_date: new Date().toISOString().split("T")[0],
      issue_date: new Date().toISOString().split("T")[0],
      payment_to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      seller_name: "Inżynieria Wodna DO-KOP Dominik Witkowski",
      seller_tax_no: "7393960834",
      seller_post_code: "11-510",
      seller_city: "Krzywe",
      seller_street: "Krzywe 1/2",
      buyer_name: customerName || customerEmail,
      buyer_email: customerEmail,
      buyer_tax_no: customerNip || "",
      currency: "PLN",
      payment_type: "transfer",
      positions: [
        {
          name: productName,
          quantity: 1,
          unit: "szt.",
          total_price_gross: grossAmount,
          tax: "23",
        }
      ],
      // Wysyłka do KSeF automatycznie
      ksef: true,
    }
  };

  const response = await fetch(`https://${domain}.fakturownia.pl/invoices.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoiceData),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Fakturownia error:", data);
    throw new Error(`Fakturownia error: ${JSON.stringify(data)}`);
  }

  console.log(`🧾 Faktura wystawiona: ${data.number} dla ${customerEmail}`);
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
  // 1. NOWA SUBSKRYPCJA — utwórz token i wyślij email
  // ─────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

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
    const token = require("crypto").randomBytes(6).toString("hex").toUpperCase();

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
        from: "KSeF Asystent <onboarding@resend.dev>",
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
        from: "KSeF Asystent <onboarding@resend.dev>",
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
        from: "KSeF Asystent <onboarding@resend.dev>",
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
  // 4. ODNOWIENIE — token dalej aktywny, tylko logowanie
  // ─────────────────────────────────────────────────────────────
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    if (invoice.billing_reason === "subscription_cycle") {
      console.log(`🔄 Odnowiono subskrypcję ${invoice.subscription}`);
    }
    return res.status(200).json({ received: true, renewed: true });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. JEDNORAZOWY RESET LIMITU — zeruj monthly_count
  // ─────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    if (session.mode === "payment") {
      const customerEmail = session.customer_details?.email;
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      if (priceId === RESET_PRICE_ID && customerEmail) {
        // Znajdź token po emailu i wyzeruj licznik
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
            from: "KSeF Asystent <onboarding@resend.dev>",
            to: customerEmail,
            subject: "Limit wiadomości zresetowany — KSeF Asystent",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Limit wiadomości został zresetowany!</h2>
                <p>Twój miesięczny limit wiadomości został wyzerowany. Możesz teraz korzystać z asystenta bez ograniczeń do końca nowego cyklu.</p>
                <a href="https://ksef-asystent.vercel.app"
                   style="display:inline-block; background:#4f46e5; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; margin-top:12px;">
                  Wróć do KSeF Asystenta
                </a>
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  Pytania: <a href="mailto:dominowit@gmail.com">dominowit@gmail.com</a>
                </p>
              </div>
            `,
          });

          // Wystaw fakturę za reset
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
    }
  }

  return res.status(200).json({ received: true, skipped: true });
}
