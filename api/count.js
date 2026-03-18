// api/chat/count.js — zwraca aktualny licznik dla danego fingerprintu
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { fingerprint } = req.body;
  if (!fingerprint) return res.status(200).json({ count: 0 });

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

  return res.status(200).json({ count, resetAt: shouldReset ? null : data?.reset_at || null });
}
