export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

// Soma N meses a uma data, mantendo o "dia" (ajustando pro último dia do mês
// quando o mês de destino for mais curto, ex: 31 de jan -> 28/29 de fev).
export function addMonthsKeepingDay(dateStr, months) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

// Próximo vencimento = 1 mês após o último pagamento, ou 1 mês após o início
// da assinatura se ainda não houve nenhum pagamento registrado.
export function computeNextDue(subscription, payments) {
  const subPayments = payments
    .filter((p) => p.subscription_id === subscription.id)
    .sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1));
  if (subPayments.length === 0) return addMonthsKeepingDay(subscription.start_date, 1);
  return addMonthsKeepingDay(subPayments[0].paid_at, 1);
}

export function daysUntil(dateStr) {
  const today = new Date(todayISO() + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / 86400000);
}
