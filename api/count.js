// api/count.js — zwraca licznik i fingerprint bazowany na IP + user agent
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Generuj fingerprint po stronie serwera z IP + user agent
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${ip}::${ua}`)
    .digest("hex");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data } = await supabase
    .from("free_usage")
    .select("message_count, reset_at")
    .eq("fingerprint", fingerprint)
    .single();

  const now = new Date();
  const resetAt = data?.reset_at ? new Date(data.reset_at) : null;
  const shouldReset = !resetAt || now > resetAt;
  const count = shouldReset ? 0 : (data?.message_count || 0);

  return res.status(200).json({
    fingerprint,
    count,
    resetAt: shouldReset ? null : data?.reset_at || null,
  });
}
