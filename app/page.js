"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Scissors, Users, Calendar, Settings, Plus, X, Check,
  AlertTriangle, Clock, Mail, Phone, Trash2, Edit2, LogOut, Send,
} from "lucide-react";
import { computeNextDue, daysUntil, todayISO, fmtDate } from "@/lib/dates";

const PLAN_LABELS = { cabelo: "Cabelo ilimitado", cabelo_barba: "Cabelo + Barba" };
const PLAN_DEFAULTS = { cabelo: 59.99, cabelo_barba: 79.99 };

async function api(path, options) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Erro na requisição");
  }
  return res.json();
}

export default function Home() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await api("/api/data");
      setData(d);
    } catch (e) {
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const withRefresh = useCallback(
    async (fn) => {
      try {
        setErrorMsg("");
        await fn();
        await load();
      } catch (e) {
        setErrorMsg(e.message);
      }
    },
    [load]
  );

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading || !data) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ color: "var(--brass)", fontFamily: "var(--font-display)", fontSize: 18 }}>
          Abrindo o livro de clientes…
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="bg-texture" />
      <Header tab={tab} setTab={setTab} onLogout={logout} />
      <main className="content">
        {errorMsg && <div className="banner-error">{errorMsg}</div>}
        {tab === "dashboard" && <Dashboard data={data} setTab={setTab} withRefresh={withRefresh} />}
        {tab === "clients" && <ClientsView data={data} withRefresh={withRefresh} />}
        {tab === "agenda" && <AgendaView data={data} withRefresh={withRefresh} />}
        {tab === "settings" && <SettingsView data={data} withRefresh={withRefresh} />}
      </main>
    </div>
  );
}

function Header({ tab, setTab, onLogout }) {
  const items = [
    { id: "dashboard", label: "Hoje", icon: Scissors },
    { id: "clients", label: "Clientes", icon: Users },
    { id: "agenda", label: "Agenda", icon: Calendar },
    { id: "settings", label: "Ajustes", icon: Settings },
  ];
  return (
    <header className="header">
      <div className="brand">
        <Scissors size={20} strokeWidth={2.2} />
        <span>Souza Barbearia</span>
      </div>
      <nav className="nav">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button key={it.id} className={"nav-btn" + (tab === it.id ? " active" : "")} onClick={() => setTab(it.id)}>
              <Icon size={16} />
              <span>{it.label}</span>
            </button>
          );
        })}
        <button className="icon-btn" title="Sair" onClick={onLogout}>
          <LogOut size={15} />
        </button>
      </nav>
    </header>
  );
}

/* ---------------- Dashboard ---------------- */

function Dashboard({ data, setTab, withRefresh }) {
  const { clients, subscriptions, payments, appointments, settings } = data;

  const rows = useMemo(() => {
    return subscriptions
      .filter((s) => s.active)
      .map((s) => {
        const client = clients.find((c) => c.id === s.client_id);
        const due = computeNextDue(s, payments);
        const dLeft = daysUntil(due);
        let status = "ok";
        if (dLeft < 0) status = "atrasado";
        else if (dLeft <= settings.reminder_days_before) status = "vencendo";
        return { sub: s, client, due, dLeft, status };
      })
      .sort((a, b) => a.dLeft - b.dLeft);
  }, [clients, subscriptions, payments, settings]);

  const atrasados = rows.filter((r) => r.status === "atrasado");
  const vencendo = rows.filter((r) => r.status === "vencendo");

  const todayAppts = appointments
    .filter((a) => a.appt_date === todayISO())
    .sort((a, b) => a.appt_time.localeCompare(b.appt_time));

  const registerPayment = (subscriptionId) =>
    withRefresh(() => api("/api/payments", { method: "POST", body: JSON.stringify({ subscription_id: subscriptionId }) }));

  return (
    <div className="stack-lg">
      <div className="grid-3">
        <StatCard label="Clientes ativos" value={rows.length} tone="brass" />
        <StatCard label="Vencendo em breve" value={vencendo.length} tone="amber" />
        <StatCard label="Atrasados" value={atrasados.length} tone="red" />
      </div>

      {atrasados.length > 0 && (
        <Section title="Pagamentos atrasados" icon={AlertTriangle} tone="red">
          <RenewalList rows={atrasados} onPay={registerPayment} />
        </Section>
      )}

      {vencendo.length > 0 && (
        <Section title="Vencendo nos próximos dias" icon={Clock} tone="amber">
          <RenewalList rows={vencendo} onPay={registerPayment} />
        </Section>
      )}

      <Section title={`Agenda de hoje — ${fmtDate(todayISO())}`} icon={Calendar}>
        {todayAppts.length === 0 ? (
          <EmptyHint text="Nenhum horário marcado hoje." action="Ver agenda" onAction={() => setTab("agenda")} />
        ) : (
          <div className="stack-sm">
            {todayAppts.map((a) => {
              const c = clients.find((cl) => cl.id === a.client_id);
              return (
                <div key={a.id} className="row-item">
                  <span className="mono">{a.appt_time?.slice(0, 5)}</span>
                  <span>{c ? c.name : "Cliente removido"}</span>
                  <span className="muted">{a.service}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function RenewalList({ rows, onPay }) {
  return (
    <div className="stack-sm">
      {rows.map(({ sub, client, due, dLeft }) => (
        <div key={sub.id} className="row-item">
          <span>{client ? client.name : "Cliente removido"}</span>
          <span className="muted">{PLAN_LABELS[sub.type]} · R$ {sub.value}</span>
          <span className={dLeft < 0 ? "tag tag-red" : "tag tag-amber"}>
            {dLeft < 0 ? `${Math.abs(dLeft)}d atrasado` : dLeft === 0 ? "vence hoje" : `vence em ${dLeft}d`}
          </span>
          <span className="mono muted">{fmtDate(due)}</span>
          <button className="btn-ghost" onClick={() => onPay(sub.id)}>
            <Check size={14} /> Marcar pago
          </button>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={"stat-card tone-" + tone}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Section({ title, icon: Icon, tone, children }) {
  return (
    <section className={"panel" + (tone ? " tone-" + tone + "-border" : "")}>
      <div className="panel-title">
        {Icon && <Icon size={16} />}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text, action, onAction }) {
  return (
    <div className="empty-hint">
      <span className="muted">{text}</span>
      {action && (
        <button className="link-btn" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

/* ---------------- Clients ---------------- */

function ClientsView({ data, withRefresh }) {
  const { clients, subscriptions, payments, settings } = data;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [reengOpen, setReengOpen] = useState(null);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (client) => { setEditing(client); setFormOpen(true); };

  const saveClient = (clientPayload, subPayload) =>
    withRefresh(async () => {
      if (editing) {
        await api(`/api/clients/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ client: clientPayload, subscription: subPayload }),
        });
      } else {
        await api("/api/clients", {
          method: "POST",
          body: JSON.stringify({ client: clientPayload, subscription: subPayload }),
        });
      }
      setFormOpen(false);
    });

  const removeClient = (clientId) => {
    if (!confirm("Remover este cliente e o histórico dele?")) return;
    withRefresh(() => api(`/api/clients/${clientId}`, { method: "DELETE" }));
  };

  const registerPayment = (subscriptionId) =>
    withRefresh(() => api("/api/payments", { method: "POST", body: JSON.stringify({ subscription_id: subscriptionId }) }));

  const sendReengajamento = (clientId) =>
    withRefresh(async () => {
      await api("/api/reengajamento", { method: "POST", body: JSON.stringify({ client_id: clientId }) });
      setReengOpen(null);
    });

  return (
    <div className="stack-lg">
      <div className="row-between">
        <h1 className="page-title">Clientes</h1>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={16} /> Novo cliente
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="panel">
          <EmptyHint text="Nenhum cliente cadastrado ainda." action="Cadastrar o primeiro" onAction={openNew} />
        </div>
      ) : (
        <div className="stack-sm">
          {clients.map((c) => {
            const sub = subscriptions.find((s) => s.client_id === c.id && s.active);
            const due = sub ? computeNextDue(sub, payments) : null;
            const dLeft = due ? daysUntil(due) : null;
            return (
              <div key={c.id} className="client-card">
                <div className="client-main">
                  <div className="client-name">{c.name}</div>
                  <div className="client-contact muted">
                    {c.phone && <span><Phone size={12} /> {c.phone}</span>}
                    {c.email && <span><Mail size={12} /> {c.email}</span>}
                  </div>
                </div>
                <div className="client-plan">
                  {sub ? (
                    <>
                      <span>{PLAN_LABELS[sub.type]}</span>
                      <span className="mono">R$ {sub.value}</span>
                      <span className={dLeft < 0 ? "tag tag-red" : dLeft <= settings.reminder_days_before ? "tag tag-amber" : "tag tag-green"}>
                        {dLeft < 0 ? `atrasado ${Math.abs(dLeft)}d` : `vence ${fmtDate(due)}`}
                      </span>
                    </>
                  ) : (
                    <span className="muted">Sem assinatura ativa</span>
                  )}
                </div>
                <div className="client-actions">
                  {sub && (
                    <button className="btn-ghost" title="Registrar pagamento" onClick={() => registerPayment(sub.id)}>
                      <Check size={15} /> Pago
                    </button>
                  )}
                  {c.email && (
                    <button className="icon-btn" title="Enviar e-mail de reengajamento" onClick={() => setReengOpen(c)}>
                      <Send size={15} />
                    </button>
                  )}
                  <button className="icon-btn" title="Editar" onClick={() => openEdit(c)}>
                    <Edit2 size={15} />
                  </button>
                  <button className="icon-btn danger" title="Remover" onClick={() => removeClient(c.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <ClientForm
          client={editing}
          currentSub={editing ? subscriptions.find((s) => s.client_id === editing.id && s.active) : null}
          onCancel={() => setFormOpen(false)}
          onSave={saveClient}
        />
      )}

      {reengOpen && (
        <ConfirmModal
          title={`Enviar e-mail pra ${reengOpen.name}?`}
          body="Um convite carinhoso pra voltar a marcar horário será enviado agora pro e-mail cadastrado. O texto pode ser ajustado em Ajustes."
          onCancel={() => setReengOpen(null)}
          onConfirm={() => sendReengajamento(reengOpen.id)}
        />
      )}
    </div>
  );
}

function ConfirmModal({ title, body, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <p className="hint-text">{body}</p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary" onClick={onConfirm}>Enviar</button>
        </div>
      </div>
    </div>
  );
}

function ClientForm({ client, currentSub, onCancel, onSave }) {
  const [name, setName] = useState(client?.name || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [email, setEmail] = useState(client?.email || "");
  const [planType, setPlanType] = useState(currentSub?.type || "cabelo");
  const [value, setValue] = useState(currentSub?.value ?? PLAN_DEFAULTS.cabelo);
  const [startDate, setStartDate] = useState(currentSub?.start_date || todayISO());

  const handlePlanChange = (type) => {
    setPlanType(type);
    if (!currentSub) setValue(PLAN_DEFAULTS[type]);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(
      { name: name.trim(), phone: phone.trim(), email: email.trim() },
      { type: planType, value: Number(value), start_date: startDate }
    );
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>{client ? "Editar cliente" : "Novo cliente"}</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>

        <label className="field">
          <span>Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" required />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Telefone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
          </label>
        </div>

        <div className="field">
          <span>Plano</span>
          <div className="plan-toggle">
            <button type="button" className={planType === "cabelo" ? "active" : ""} onClick={() => handlePlanChange("cabelo")}>Cabelo</button>
            <button type="button" className={planType === "cabelo_barba" ? "active" : ""} onClick={() => handlePlanChange("cabelo_barba")}>Cabelo + Barba</button>
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Valor mensal (R$)</span>
            <input type="number" min="0" step="5" value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <label className="field">
            <span>{currentSub ? "Início da assinatura" : "Data de início"}</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        </div>
        <p className="hint-text">O valor pode ser diferente do padrão do plano — dá pra ajustar por cliente sem problema.</p>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary">Salvar</button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Agenda ---------------- */

function isWithinLunch(time, settings) {
  if (!settings.lunch_start || !settings.lunch_end) return false;
  const t = time; // "HH:MM"
  return t >= settings.lunch_start.slice(0, 5) && t < settings.lunch_end.slice(0, 5);
}

function AgendaView({ data, withRefresh }) {
  const { clients, appointments, settings, services } = data;
  const [date, setDate] = useState(todayISO());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const isSunday = new Date(date + "T00:00:00").getDay() === 0;
  const closedToday = isSunday && settings.closed_sunday;

  const slots = useMemo(() => {
    const list = [];
    const totalMinutes = (settings.work_end - settings.work_start) * 60;
    for (let m = 0; m < totalMinutes; m += settings.slot_minutes) {
      const h = settings.work_start + Math.floor(m / 60);
      const min = m % 60;
      const time = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      if (isWithinLunch(time, settings)) continue;
      list.push(time);
    }
    return list;
  }, [settings]);

  const dayAppts = appointments.filter((a) => a.appt_date === date);
  const byTime = Object.fromEntries(dayAppts.map((a) => [a.appt_time?.slice(0, 5), a]));

  const openBooking = (time) => { setSelectedSlot(time); setFormOpen(true); };

  const book = (clientId, service) =>
    withRefresh(async () => {
      await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify({ client_id: clientId, appt_date: date, appt_time: selectedSlot, service }),
      });
      setFormOpen(false);
    });

  const cancelAppt = (id) => withRefresh(() => api(`/api/appointments/${id}`, { method: "DELETE" }));

  return (
    <div className="stack-lg">
      <div className="row-between">
        <h1 className="page-title">Agenda</h1>
        <input type="date" className="date-input" style={{ width: "auto" }} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {closedToday ? (
        <div className="panel">
          <p className="hint-text">Fechado aos domingos — nenhum horário disponível nesse dia.</p>
        </div>
      ) : (
        <div className="panel">
          <div className="slot-grid">
            {slots.map((time) => {
              const appt = byTime[time];
              const client = appt ? clients.find((c) => c.id === appt.client_id) : null;
              return (
                <div key={time} className={"slot" + (appt ? " taken" : "")}>
                  <span className="mono slot-time">{time}</span>
                  {appt ? (
                    <div className="slot-info">
                      <span>{client ? client.name : "Cliente removido"}</span>
                      <span className="muted">{appt.service}</span>
                      <button className="icon-btn danger" onClick={() => cancelAppt(appt.id)}><X size={14} /></button>
                    </div>
                  ) : (
                    <button className="slot-free" onClick={() => openBooking(time)}>Livre — marcar</button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="hint-text" style={{ marginTop: 10 }}>
            Pausa de almoço ({settings.lunch_start?.slice(0, 5)}–{settings.lunch_end?.slice(0, 5)}) já sai de fora dos horários.
          </p>
        </div>
      )}

      {formOpen && (
        <BookingForm clients={clients} services={services} time={selectedSlot} date={date} onCancel={() => setFormOpen(false)} onSave={book} />
      )}
    </div>
  );
}

function BookingForm({ clients, services, time, date, onCancel, onSave }) {
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [service, setService] = useState(services[0]?.name || "Cabelo");

  const submit = (e) => {
    e.preventDefault();
    if (!clientId) return;
    onSave(clientId, service);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <h2>Marcar {time} — {fmtDate(date)}</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        {clients.length === 0 ? (
          <p className="hint-text">Cadastre um cliente antes de marcar um horário.</p>
        ) : (
          <>
            <label className="field">
              <span>Cliente</span>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Serviço</span>
              <select value={service} onChange={(e) => setService(e.target.value)}>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>{s.name} — R$ {s.price}</option>
                ))}
                <option value="Mensalista">Cliente mensalista (sem cobrança avulsa)</option>
              </select>
            </label>
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={clients.length === 0}>Marcar</button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsView({ data, withRefresh }) {
  const { settings, services } = data;
  const [local, setLocal] = useState({
    ...settings,
    lunch_start: settings.lunch_start?.slice(0, 5) || "12:00",
    lunch_end: settings.lunch_end?.slice(0, 5) || "13:30",
  });

  const save = (e) => {
    e.preventDefault();
    withRefresh(() =>
      api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          reminder_days_before: Number(local.reminder_days_before),
          work_start: Number(local.work_start),
          work_end: Number(local.work_end),
          lunch_start: local.lunch_start,
          lunch_end: local.lunch_end,
          closed_sunday: local.closed_sunday,
          slot_minutes: Number(local.slot_minutes),
          reengajamento_template: local.reengajamento_template,
        }),
      })
    );
  };

  return (
    <div className="stack-lg">
      <h1 className="page-title">Ajustes</h1>
      <form className="panel stack-md" onSubmit={save}>
        <label className="field">
          <span>Avisar vencimento com quantos dias de antecedência</span>
          <input type="number" min="0" max="30" value={local.reminder_days_before}
            onChange={(e) => setLocal({ ...local, reminder_days_before: e.target.value })} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Início do expediente</span>
            <input type="number" min="0" max="23" value={local.work_start}
              onChange={(e) => setLocal({ ...local, work_start: e.target.value })} />
          </label>
          <label className="field">
            <span>Fim do expediente</span>
            <input type="number" min="0" max="23" value={local.work_end}
              onChange={(e) => setLocal({ ...local, work_end: e.target.value })} />
          </label>
          <label className="field">
            <span>Duração do horário (min)</span>
            <input type="number" min="10" step="5" value={local.slot_minutes}
              onChange={(e) => setLocal({ ...local, slot_minutes: e.target.value })} />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Início do almoço</span>
            <input type="time" value={local.lunch_start}
              onChange={(e) => setLocal({ ...local, lunch_start: e.target.value })} />
          </label>
          <label className="field">
            <span>Fim do almoço</span>
            <input type="time" value={local.lunch_end}
              onChange={(e) => setLocal({ ...local, lunch_end: e.target.value })} />
          </label>
          <label className="field" style={{ justifyContent: "flex-end" }}>
            <span>&nbsp;</span>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)" }}>
              <input type="checkbox" style={{ width: "auto" }} checked={local.closed_sunday}
                onChange={(e) => setLocal({ ...local, closed_sunday: e.target.checked })} />
              Fecha aos domingos
            </label>
          </label>
        </div>
        <label className="field">
          <span>Texto do e-mail de "sentimos sua falta" (use {"{nome}"} pro nome do cliente)</span>
          <textarea
            value={local.reengajamento_template}
            onChange={(e) => setLocal({ ...local, reengajamento_template: e.target.value })}
            rows={3}
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: 7, padding: 9, fontFamily: "var(--font-body)", fontSize: 14 }}
          />
        </label>
        <div className="modal-actions">
          <button type="submit" className="btn-primary">Salvar ajustes</button>
        </div>
      </form>

      <ServicesPanel services={services} withRefresh={withRefresh} />

      <div className="panel">
        <p className="hint-text">
          Os lembretes de vencimento e atraso são enviados automaticamente todo dia (Vercel Cron).
          O e-mail de reengajamento é enviado manualmente, na tela de Clientes, quando você quiser
          dar aquele empurrãozinho num cliente específico.
        </p>
      </div>
    </div>
  );
}

function ServicesPanel({ services, withRefresh }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const addService = (e) => {
    e.preventDefault();
    if (!name.trim() || price === "") return;
    withRefresh(async () => {
      await api("/api/services", { method: "POST", body: JSON.stringify({ name: name.trim(), price: Number(price) }) });
      setName(""); setPrice(""); setAdding(false);
    });
  };

  const removeService = (id) => {
    if (!confirm("Remover este serviço da lista?")) return;
    withRefresh(() => api(`/api/services/${id}`, { method: "DELETE" }));
  };

  return (
    <Section title="Serviços avulsos (não-mensalistas)" icon={Scissors}>
      <div className="stack-sm">
        {services.map((s) => (
          <div key={s.id} className="row-item">
            <span style={{ flex: 1 }}>{s.name}</span>
            <span className="mono">R$ {s.price}</span>
            <button className="icon-btn danger" title="Remover" onClick={() => removeService(s.id)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <form className="field-row" style={{ marginTop: 10, alignItems: "flex-end" }} onSubmit={addService}>
          <label className="field">
            <span>Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Hidratação" autoFocus />
          </label>
          <label className="field" style={{ maxWidth: 120 }}>
            <span>Preço (R$)</span>
            <input type="number" min="0" step="5" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <button type="submit" className="btn-primary">Adicionar</button>
          <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>Cancelar</button>
        </form>
      ) : (
        <button className="link-btn" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>
          + Adicionar serviço (ex: hidratação, botox, pigmentação)
        </button>
      )}
    </Section>
  );
}
