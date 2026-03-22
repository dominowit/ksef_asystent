// api/verify-trial.js
// Obsługuje kliknięcie magic linka → aktywuje trial → przekierowuje na stronę z sesją

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getFingerprint(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  return crypto.createHash("sha256").update(`${ip}::${ua}`).digest("hex");
}

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.redirect(`${process.env.APP_URL}?trial_error=missing_token`);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Znajdź trial po magic tokenie
  const { data: trial, error } = await supabase
    .from("trial_sessions")
    .select("*")
    .eq("magic_token", token)
    .maybeSingle();

  if (error || !trial) {
    return res.redirect(`${process.env.APP_URL}?trial_error=invalid_token`);
  }

  // Link już użyty — ale trial może być aktywny (użytkownik klika ponownie)
  if (trial.status === "active") {
    // Odśwież session_token i przekieruj — obsługuje przypadek wyczyszczonego localStorage
    return res.redirect(`${process.env.APP_URL}?trial_session=${trial.session_token}&trial_email=${encodeURIComponent(trial.email)}`);
  }

  if (trial.status === "expired") {
    return res.redirect(`${process.env.APP_URL}?trial_error=expired`);
  }

  if (trial.status === "converted") {
    return res.redirect(`${process.env.APP_URL}?trial_error=converted`);
  }

  // Sprawdź TTL magic linka (24h)
  if (new Date() > new Date(trial.token_expires_at)) {
    await supabase
      .from("trial_sessions")
      .update({ status: "expired" })
      .eq("magic_token", token);
    return res.redirect(`${process.env.APP_URL}?trial_error=link_expired`);
  }

  // Aktywuj trial
  const now = new Date();
  const trialExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const fingerprint = getFingerprint(req);

  const { error: updateError } = await supabase
    .from("trial_sessions")
    .update({
      status: "active",
      token_used_at: now.toISOString(),
      trial_starts_at: now.toISOString(),
      trial_expires_at: trialExpiresAt,
      session_token: sessionToken,
      fingerprint, // zaktualizuj fingerprint — może być inny browser niż przy zapisie
    })
    .eq("magic_token", token);

  if (updateError) {
    console.error("Trial activate error:", updateError);
    return res.redirect(`${process.env.APP_URL}?trial_error=server_error`);
  }

  // Przekieruj na stronę z session tokenem w URL
  // App.jsx przechwyci parametry i zapisze w localStorage
  return res.redirect(
    `${process.env.APP_URL}?trial_session=${sessionToken}&trial_email=${encodeURIComponent(trial.email)}`
  );
}
