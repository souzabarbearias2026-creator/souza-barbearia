import { supabase } from "@/lib/supabase";

export async function PATCH(request, { params }) {
  const body = await request.json();
  const update = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.price !== undefined) update.price = body.price;
  if (body.active !== undefined) update.active = body.active;

  const { error } = await supabase.from("services").update(update).eq("id", params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  // Soft delete: mantém o histórico de agendamentos que usaram esse serviço.
  const { error } = await supabase.from("services").update({ active: false }).eq("id", params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
