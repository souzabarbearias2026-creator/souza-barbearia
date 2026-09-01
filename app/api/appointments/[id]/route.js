import { supabase } from "@/lib/supabase";

export async function DELETE(_request, { params }) {
  const { error } = await supabase.from("appointments").delete().eq("id", params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
