-- Cole isso no SQL Editor do seu projeto Supabase (Database > SQL Editor > New query)

create extension if not exists pgcrypto;

create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  type text not null check (type in ('cabelo', 'cabelo_barba')),
  value numeric(10,2) not null,       -- valor individual do cliente, independente do padrão do plano
  start_date date not null,
  active boolean default true
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references subscriptions(id) on delete cascade,
  paid_at date not null default current_date,
  value numeric(10,2)
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  appt_date date not null,
  appt_time time not null,
  service text
);

-- Serviços avulsos (não-mensalistas). O barbeiro consegue adicionar/editar/
-- remover pela tela de Ajustes — sem precisar mexer em código quando for
-- lançar hidratação, botox, pigmentação etc.
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null,
  active boolean default true,
  sort_order int default 0
);
insert into services (name, price, sort_order) values
  ('Só máquina', 20.00, 1),
  ('Degradê', 25.00, 2),
  ('Só tesoura', 30.00, 3),
  ('Corte, barba e sobrancelha', 45.00, 4);

create table settings (
  id int primary key default 1,
  reminder_days_before int default 3,
  work_start int default 10,
  work_end int default 20,
  lunch_start time default '12:00',
  lunch_end time default '13:30',
  closed_sunday boolean default true,
  slot_minutes int default 30,
  reengajamento_template text default 'Oi {nome}! Faz um tempo que a gente não se vê por aqui. Bora marcar um horário e dar um trato no visual?'
);
insert into settings (id) values (1);

-- Vista auxiliar usada pelo cron de lembretes: calcula o próximo vencimento
-- de cada assinatura ativa a partir do último pagamento (ou da data de início,
-- se ainda não houve pagamento nenhum).
create or replace view subscription_status as
select
  s.id as subscription_id,
  s.client_id,
  s.type,
  s.value,
  coalesce(
    (select (max(p.paid_at) + interval '1 month')::date
     from payments p where p.subscription_id = s.id),
    (s.start_date + interval '1 month')::date
  ) as next_due,
  c.name, c.email, c.phone
from subscriptions s
join clients c on c.id = s.client_id
where s.active = true;

-- Este projeto acessa o banco só pelo backend (chave service_role, nunca exposta
-- ao navegador), então não é necessário Row Level Security aqui. Se no futuro
-- o front passar a falar direto com o Supabase, ative RLS e crie policies antes.
