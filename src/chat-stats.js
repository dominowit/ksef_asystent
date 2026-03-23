// api/chat-stats.js — zwraca ile wiadomości zostało w planie

import { createClient } from "@supabase/supabase-js";

const PLAN_LIMITS = {
  solo: 200,
  small: 600,
  firma: 2000,
};

async function verifyToken(token) {
  if (!token) return null;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data, error } = await supabase
    .from("paid_tokens")
    .select("plan, active, monthly_count, count_reset_at")
    .eq("token", token.toUpperCase())
    .eq("active", true)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method !== "POST") return res.status(405).end();

  const { userToken } = req.body;
  const tokenData = await verifyToken(userToken);

  if (!tokenData) {
    return res.status(401).json({ error: "Nieprawidłowy token" });
  }

  const plan = tokenData.plan;
  const limit = PLAN_LIMITS[plan] || 200;

  const now = new Date();
  const resetAt = tokenData.count_reset_at ? new Date(tokenData.count_reset_at) : null;
  const shouldReset = !resetAt || now > resetAt;
  const used = shouldReset ? 0 : (tokenData.monthly_count || 0);
  const remaining = Math.max(0, limit - used);
  const resetDate = resetAt && !shouldReset
    ? resetAt.toLocaleDateString("pl-PL", { day: "numeric", month: "long" })
    : null;

  return res.status(200).json({ used, remaining, limit, plan, resetDate });
}
