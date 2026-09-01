import { supabase } from "@/lib/supabase";
import { todayISO } from "@/lib/dates";

export async function POST(request) {
  const { subscription_id, value } = await request.json();
  if (!subscription_id) {
    return Response.json({ error: "subscription_id é obrigatório" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("payments")
    .insert({ subscription_id, paid_at: todayISO(), value: value ?? null })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ payment: data });
}
