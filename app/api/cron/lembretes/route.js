import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: settings, error: settingsErr } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (settingsErr) return Response.json({ error: settingsErr.message }, { status: 500 });

  const { data: rows, error } = await supabase.from("subscription_status").select("*");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  let sent = 0;
  const results = [];

  for (const row of rows) {
    if (!row.email) continue;
    const due = new Date(row.next_due + "T00:00:00");
    const daysLeft = Math.round((due - today) / 86400000);

    if (daysLeft < 0) {
      await sendEmail(row, "atrasado", daysLeft);
      results.push({ client: row.name, kind: "atrasado", daysLeft });
      sent++;
    } else if (daysLeft <= settings.reminder_days_before) {
      await sendEmail(row, "lembrete", daysLeft);
      results.push({ client: row.name, kind: "lembrete", daysLeft });
      sent++;
    }
  }

  return Response.json({ ok: true, sent, results });
}

async function sendEmail(row, kind, daysLeft) {
  const subject = kind === "atrasado" ? "Sua mensalidade está em atraso" : "Sua renovação está chegando";

  const body =
    kind === "atrasado"
      ? `Oi ${row.name}, notamos que sua mensalidade venceu há ${Math.abs(daysLeft)} dia(s). Bora regularizar pra manter seu horário garantido?`
      : `Oi ${row.name}, sua mensalidade vence em ${daysLeft} dia(s). Já pode renovar e garantir seu próximo corte!`;

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: row.email,
    subject,
    text: body,
  });
  if (error) console.error(`Falha ao enviar pra ${row.email}:`, error.message);
}
