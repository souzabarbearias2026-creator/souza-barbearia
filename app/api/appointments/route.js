import { supabase } from "@/lib/supabase";

export async function POST(request) {
  const { client_id, appt_date, appt_time, service } = await request.json();

  if (!client_id || !appt_date || !appt_time) {
    return Response.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("appointments")
    .insert({ client_id, appt_date, appt_time, service: service || null })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ appointment: data });
}
