// api/request-trial.js
// Przyjmuje email → sprawdza czy może dostać trial → wysyła magic link przez Resend

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";

function getFingerprint(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  return crypto.createHash("sha256").update(`${ip}::${ua}`).digest("hex");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "Podaj poprawny adres email." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const fingerprint = getFingerprint(req);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Sprawdź czy email był już użyty do trialu (active lub expired)
  const { data: existingByEmail } = await supabase
    .from("trial_sessions")
    .select("status, trial_expires_at")
    .eq("email", normalizedEmail)
    .in("status", ["active", "expired", "converted"])
    .maybeSingle();

  if (existingByEmail) {
    if (existingByEmail.status === "active") {
      return res.status(409).json({
        error: "already_active",
        message: "Ten email ma już aktywny trial. Sprawdź skrzynkę — wysłaliśmy Ci link dostępowy."
      });
    }
    if (existingByEmail.status === "converted") {
      return res.status(409).json({
        error: "converted",
        message: "Ten email jest już powiązany z aktywną subskrypcją."
      });
    }
    // expired — był trial, już wygasł
    return res.status(409).json({
      error: "trial_used",
      message: "Ten adres email był już użyty do trialu. Zapraszamy do wyboru planu."
    });
  }

  // Sprawdź czy ten fingerprint miał już trial
  const { data: existingByFp } = await supabase
    .from("trial_sessions")
    .select("status")
    .eq("fingerprint", fingerprint)
    .in("status", ["active", "expired", "converted"])
    .maybeSingle();

  if (existingByFp) {
    // Nie mów wprost o fingerprincie — po prostu skieruj do planu
    return res.status(409).json({
      error: "trial_used",
      message: "Wygląda na to że trial był już aktywowany z tej przeglądarki. Zapraszamy do wyboru planu."
    });
  }

  // Utwórz rekord trial z magic tokenem
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  const { data: trial, error: insertError } = await supabase
    .from("trial_sessions")
    .insert({
      email: normalizedEmail,
      fingerprint,
      token_expires_at: tokenExpiresAt,
      status: "pending",
    })
    .select("magic_token")
    .single();

  if (insertError) {
    console.error("Insert trial error:", insertError);
    return res.status(500).json({ error: "Błąd serwera. Spróbuj ponownie." });
  }

  const magicLink = `${process.env.APP_URL}/api/verify-trial?token=${trial.magic_token}`;

  // Wyślij email z magic linkiem
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: "Głowa do KSeF <noreply@glowadoksef.pl>",
      to: normalizedEmail,
      subject: "Twój 7-dniowy dostęp do Głowy do KSeF",
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e1b4b;">
          <div style="background: linear-gradient(135deg, #3730a3, #4f46e5); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 1.4rem;">Głowa do KSeF</h1>
            <p style="color: #c7d2fe; margin: 6px 0 0; font-size: 0.9rem;">7 dni pełnego dostępu</p>
          </div>
          <div style="background: white; padding: 28px 32px; border: 1px solid #e0e7ff; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 16px;">Kliknij poniższy przycisk, aby aktywować 7-dniowy trial:</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${magicLink}"
                 style="background: #4f46e5; color: white; padding: 14px 32px; border-radius: 10px;
                        text-decoration: none; font-weight: 700; font-size: 1rem; display: inline-block;">
                Aktywuj 7 dni dostępu →
              </a>
            </div>
            <p style="margin: 0 0 8px; font-size: 0.85rem; color: #6b7280;">
              Link jest ważny przez <strong>24 godziny</strong>. Trial trwa 7 dni od momentu kliknięcia.
            </p>
            <p style="margin: 0; font-size: 0.85rem; color: #6b7280;">
              Jeśli nie prosiłeś o trial — zignoruj ten email.
            </p>
            <hr style="border: none; border-top: 1px solid #e0e7ff; margin: 20px 0;" />
            <p style="margin: 0; font-size: 0.78rem; color: #9ca3af;">
              Podając adres email, dołączyłeś do newslettera Głowy do KSeF.
              Możesz wypisać się w każdej chwili, klikając "Wypisz się" w stopce kolejnych wiadomości.
              Pytania: <a href="mailto:kontakt@glowadoksef.pl" style="color: #6366f1;">kontakt@glowadoksef.pl</a>
            </p>
          </div>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error("Resend error:", emailErr);
    // Usuń rekord jeśli email nie poszedł — żeby użytkownik mógł spróbować ponownie
    await supabase.from("trial_sessions").delete().eq("magic_token", trial.magic_token);
    return res.status(500).json({ error: "Nie udało się wysłać emaila. Sprawdź adres i spróbuj ponownie." });
  }

  // Dodaj do Resend Audience
  try {
    await resend.contacts.create({
      audienceId: process.env.RESEND_AUDIENCE_ID,
      email: normalizedEmail,
      unsubscribed: false,
    });
  } catch (audienceErr) {
    // Nie blokuj — email już poszedł, audience to nice-to-have
    console.warn("Resend audience error:", audienceErr.message);
  }

  return res.status(200).json({ ok: true, message: "Sprawdź skrzynkę — wysłaliśmy Ci link aktywacyjny." });
}
