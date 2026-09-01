import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Dispara manualmente um e-mail de "sentimos sua falta" pra um cliente
// específico, usando o texto configurável guardado em `settings.reengajamento_template`.
export async function POST(request) {
  const { client_id } = await request.json();

  const { data: client, error } = await supabase
    .from("clients")
    .select("name, email")
    .eq("id", client_id)
    .single();
  if (error || !client) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
  if (!client.email) return Response.json({ error: "Cliente sem e-mail cadastrado" }, { status: 400 });

  const { data: settings } = await supabase
    .from("settings")
    .select("reengajamento_template")
    .eq("id", 1)
    .single();

  const template =
    settings?.reengajamento_template ||
    "Oi {nome}! Faz um tempo que a gente não se vê por aqui. Bora marcar um horário?";
  const body = template.replace("{nome}", client.name);

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: client.email,
    subject: "Sentimos sua falta!",
    text: body,
  });

  return Response.json({ ok: true });
}
