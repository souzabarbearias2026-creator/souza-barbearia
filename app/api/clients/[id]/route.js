import { supabase } from "@/lib/supabase";

export async function PATCH(request, { params }) {
  const { id } = params;
  const { client, subscription } = await request.json();

  if (client) {
    const { error } = await supabase
      .from("clients")
      .update({ name: client.name?.trim(), phone: client.phone || null, email: client.email || null })
      .eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (subscription) {
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("client_id", id)
      .eq("active", true)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          type: subscription.type,
          value: subscription.value,
          start_date: subscription.start_date,
        })
        .eq("id", existing.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase.from("subscriptions").insert({
        client_id: id,
        type: subscription.type,
        value: subscription.value,
        start_date: subscription.start_date,
        active: true,
      });
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  const { id } = params;
  // As assinaturas e pagamentos do cliente são removidos em cascata (FK on delete cascade).
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
