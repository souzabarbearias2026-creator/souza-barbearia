import { supabase } from "@/lib/supabase";

export async function POST(request) {
  const { client, subscription } = await request.json();

  if (!client?.name?.trim()) {
    return Response.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const { data: newClient, error: clientErr } = await supabase
    .from("clients")
    .insert({ name: client.name.trim(), phone: client.phone || null, email: client.email || null })
    .select()
    .single();
  if (clientErr) return Response.json({ error: clientErr.message }, { status: 500 });

  const { data: newSub, error: subErr } = await supabase
    .from("subscriptions")
    .insert({
      client_id: newClient.id,
      type: subscription.type,
      value: subscription.value,
      start_date: subscription.start_date,
      active: true,
    })
    .select()
    .single();
  if (subErr) return Response.json({ error: subErr.message }, { status: 500 });

  return Response.json({ client: newClient, subscription: newSub });
}
