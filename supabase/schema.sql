-- ════════════════════════════════════════════════════════════════════════
--  JICREA — Software de Gestión · Esquema de base de datos (Supabase / Postgres)
--  Versión 1.0
--
--  CÓMO USAR:
--   1. Entrá a tu proyecto en https://supabase.com → SQL Editor → New query
--   2. Pegá TODO este archivo y ejecutá (Run).
--   3. Después ejecutá seed.sql para cargar el catálogo real.
--
--  Este esquema reemplaza las 9 planillas de Google Sheets:
--   01 Listas Oficial   → products, supplies, suppliers, product_recipe
--   02 Costos y Ventas  → sales, sale_items, (+ vistas de finanzas)
--   03 Flujo de Caja    → v_cash_flow (solo lectura)
--   04 Clientes JIcrea  → clients
--   05-08 Producción    → purchases, production
--   09 Pagos Empresa    → company_payments
--
--  El stock NO se guarda en columnas: se calcula en tiempo real con vistas,
--  así nunca se desfasa (Stock = Inicial + Entradas − Salidas, exacto).
-- ════════════════════════════════════════════════════════════════════════

-- Extensiones
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────
-- PERFILES Y ROLES  (Dueño / Operario)
-- Se vincula a auth.users de Supabase. Al crear un usuario en Authentication,
-- un trigger crea su perfil con rol 'operario' por defecto.
-- ────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'operario' check (role in ('dueno','operario')),
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'operario')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: ¿el usuario actual es dueño?
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'dueno'
  );
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 01 — LISTAS OFICIAL
-- ────────────────────────────────────────────────────────────────────────

-- Proveedores
create table if not exists suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  supply_type text,                       -- tipo de insumo que provee
  zone        text,
  contact     text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Insumos (materia prima)
create table if not exists supplies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  supplier_id     uuid references suppliers(id) on delete set null,
  unit_cost       numeric(12,2) not null default 0,
  unit            text default 'unidad',
  stock_inicial   numeric(14,2) not null default 0,   -- conteo físico inicial
  low_stock_threshold numeric(14,2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Productos terminados (catálogo). 3 precios por canal + costo + mano de obra.
create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,               -- NOMBRE OFICIAL (regla de oro)
  category        text,
  cost            numeric(12,2) not null default 0,   -- costo de insumos (referencia)
  price_mayor_a   numeric(12,2),                      -- NUNCA se expone en la web pública
  price_mayor_b   numeric(12,2),
  price_minorista numeric(12,2),
  labor_cost      numeric(12,2) not null default 0,   -- mano de obra por unidad
  is_st           boolean not null default false,     -- semiterminado (termina en 'ST')
  is_combo        boolean not null default false,     -- producto compuesto
  stock_inicial   numeric(14,2) not null default 0,   -- conteo físico inicial
  low_stock_threshold numeric(14,2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Ficha Técnica: matriz producto × insumo (cuántas unidades de insumo por producto)
create table if not exists product_recipe (
  product_id  uuid not null references products(id) on delete cascade,
  supply_id   uuid not null references supplies(id) on delete cascade,
  qty         numeric(12,4) not null default 0,
  primary key (product_id, supply_id)
);

-- Combos: un producto compuesto descuenta el stock de sus componentes
create table if not exists combo_components (
  combo_id      uuid not null references products(id) on delete cascade,
  component_id  uuid not null references products(id) on delete cascade,
  qty           numeric(12,2) not null default 1,
  primary key (combo_id, component_id)
);

-- ────────────────────────────────────────────────────────────────────────
-- 04 — CLIENTES (CRM)
-- ────────────────────────────────────────────────────────────────────────
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  client_type   text check (client_type in ('mayor_a','mayor_b','minorista','empresarial')),
  locality      text,
  zone          text,
  responsible   text,
  category      text,
  contact       text,
  notes         text,
  last_contact  date,
  weekly_contact boolean not null default false,  -- marcar para "Contacto Semanal"
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- 02 — VENTAS  (Costos y Ventas)
-- Una sola tabla maneja Mayor A / Mayor B / Minorista y pedidos web.
-- Un pedido web entra con status='pendiente' y source='web' (no afecta stock
-- ni finanzas hasta que el dueño lo confirma → status='confirmado').
-- ────────────────────────────────────────────────────────────────────────
create table if not exists sales (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid references clients(id) on delete set null,
  client_name       text,                 -- snapshot / pedidos web sin cuenta
  client_contact    text,
  sale_type         text not null default 'minorista'
                      check (sale_type in ('mayor_a','mayor_b','minorista')),
  channel           text,                 -- whatsapp / instagram / feria / directo / web / otro
  source            text not null default 'manual' check (source in ('manual','web')),
  status            text not null default 'confirmado'
                      check (status in ('pendiente','confirmado','en_proceso','entregado','cancelado')),
  order_date        date not null default current_date,
  delivery_date     date,
  paid              boolean not null default false,
  paid_date         date,
  zone              text,
  shipping_info     text,
  company           text,                 -- empresa del grupo (1 / 2)
  commission_amount numeric(12,2) default 0,
  notes             text,
  total             numeric(14,2) not null default 0,   -- total real cobrado
  total_minorista_ref numeric(14,2) default 0,          -- referencia minorista (descuento mayorista web)
  total_cost        numeric(14,2) not null default 0,    -- costo de los productos vendidos
  created_at        timestamptz not null default now(),
  confirmed_at      timestamptz
);

create table if not exists sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references sales(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  product_name text not null,            -- snapshot del nombre
  qty         numeric(12,2) not null default 1,
  unit_price  numeric(12,2) not null default 0,
  unit_cost   numeric(12,2) not null default 0
);
create index if not exists idx_sale_items_sale on sale_items(sale_id);
create index if not exists idx_sale_items_product on sale_items(product_id);
create index if not exists idx_sales_status on sales(status);
create index if not exists idx_sales_date on sales(order_date);

-- ────────────────────────────────────────────────────────────────────────
-- 05-08 — PRODUCCIÓN
-- ────────────────────────────────────────────────────────────────────────

-- Compras de insumos. Suma al stock SOLO cuando status='recibido' (Regla 2).
create table if not exists purchases (
  id            uuid primary key default gen_random_uuid(),
  module        text not null default 'mates'
                  check (module in ('mates','cuero','costurera','grabados')),
  supplier_id   uuid references suppliers(id) on delete set null,
  supply_id     uuid references supplies(id) on delete set null,
  supply_name   text,
  qty           numeric(14,2) not null default 0,
  unit_price    numeric(12,2) not null default 0,
  total         numeric(14,2) not null default 0,
  order_number  text,
  status        text not null default 'pedido'
                  check (status in ('pedido','a_levantar','recibido')),
  paid          boolean not null default false,
  purchase_date date not null default current_date,
  received_date date,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_purchases_supply on purchases(supply_id);
create index if not exists idx_purchases_status on purchases(status);

-- Productos terminados entregados por el operario. Descuenta insumos por
-- Ficha Técnica (Regla 3) y suma al stock del producto. Paga mano de obra.
create table if not exists production (
  id              uuid primary key default gen_random_uuid(),
  module          text not null default 'mates'
                    check (module in ('mates','cuero','costurera','grabados')),
  product_id      uuid references products(id) on delete set null,
  product_name    text,
  qty             numeric(14,2) not null default 0,
  labor_unit_cost numeric(12,2) not null default 0,
  labor_total     numeric(14,2) not null default 0,
  prod_date       date not null default current_date,
  operator        text,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_production_product on production(product_id);

-- Pedidos de grabado al proveedor externo (módulo simple)
create table if not exists engraving_orders (
  id            uuid primary key default gen_random_uuid(),
  entry_date    date not null default current_date,
  exit_date     date,
  client_name   text,
  model         text,
  qty           numeric(12,2) not null default 0,
  price         numeric(12,2) not null default 0,
  status        text not null default 'pendiente'
                  check (status in ('pendiente','en_proceso','listo','entregado')),
  notes         text,
  created_at    timestamptz not null default now()
);

-- Mermas / roturas: descuentan stock con motivo (producto o insumo)
create table if not exists inventory_adjustments (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade,
  supply_id   uuid references supplies(id) on delete cascade,
  qty         numeric(14,2) not null default 0,   -- cantidad perdida (positiva)
  reason      text,
  adj_date    date not null default current_date,
  created_at  timestamptz not null default now(),
  check (product_id is not null or supply_id is not null)
);

-- ────────────────────────────────────────────────────────────────────────
-- 09 — PAGOS EMPRESA  (costos fijos mensuales, día 10, por empresa del grupo)
-- Regla 6: no se puede cargar dos veces el mismo mes/empresa/concepto.
-- ────────────────────────────────────────────────────────────────────────
create table if not exists company_payments (
  id            uuid primary key default gen_random_uuid(),
  company       text not null default 'Empresa 1',
  period_month  date not null,            -- primer día del mes al que corresponde
  concept       text not null,            -- BPS, DGI, FIX, Alquiler, UTE, OSE, Contador, Marketing, Otros
  amount        numeric(12,2) not null default 0,
  registered_date date not null default current_date,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (company, period_month, concept)
);

-- ════════════════════════════════════════════════════════════════════════
--  VISTAS — STOCK EN TIEMPO REAL  (nunca se desfasa)
-- ════════════════════════════════════════════════════════════════════════

-- Estados de venta que SÍ descuentan stock (confirmados, no pendientes ni cancelados)
-- pendiente (web) y cancelado NO afectan inventario ni finanzas.

-- Salidas de producto por ventas + componentes de combos vendidos
create or replace view v_product_sales_out as
  -- ítems vendidos directos
  select si.product_id, sum(si.qty) as qty_out
  from sale_items si
  join sales s on s.id = si.sale_id
  where s.status in ('confirmado','en_proceso','entregado')
    and si.product_id is not null
  group by si.product_id
  union all
  -- componentes descontados cuando se vende un combo
  select cc.component_id as product_id, sum(si.qty * cc.qty) as qty_out
  from sale_items si
  join sales s on s.id = si.sale_id
  join combo_components cc on cc.combo_id = si.product_id
  where s.status in ('confirmado','en_proceso','entregado')
  group by cc.component_id;

-- Stock de productos terminados
create or replace view v_product_stock as
select
  p.id,
  p.name,
  p.category,
  p.cost,
  p.price_mayor_a,
  p.price_mayor_b,
  p.price_minorista,
  p.is_st,
  p.is_active,
  p.low_stock_threshold,
  p.stock_inicial
    + coalesce((select sum(qty) from production pr where pr.product_id = p.id), 0)
    - coalesce((select sum(qty_out) from v_product_sales_out o where o.product_id = p.id), 0)
    - coalesce((select sum(qty) from inventory_adjustments a where a.product_id = p.id), 0)
    as stock_actual
from products p;

-- Stock de insumos = inicial + compras recibidas − consumo por ficha técnica − mermas
create or replace view v_supply_stock as
select
  su.id,
  su.name,
  su.unit,
  su.unit_cost,
  su.supplier_id,
  su.low_stock_threshold,
  su.stock_inicial,
  su.stock_inicial
    + coalesce((select sum(qty) from purchases pu
                where pu.supply_id = su.id and pu.status = 'recibido'), 0)
    - coalesce((select sum(pr.qty * r.qty)
                from production pr
                join product_recipe r on r.product_id = pr.product_id
                where r.supply_id = su.id), 0)
    - coalesce((select sum(qty) from inventory_adjustments a where a.supply_id = su.id), 0)
    as stock_actual
from supplies su;

-- ════════════════════════════════════════════════════════════════════════
--  VISTAS — FINANZAS  (mensual, automáticas)
-- ════════════════════════════════════════════════════════════════════════

-- Ventas consolidadas por mes (solo ventas que cuentan)
create or replace view v_sales_monthly as
select
  date_trunc('month', order_date)::date as period,
  sum(total)        as facturacion,
  sum(total - total_cost) as margen_bruto,
  sum(total_cost)   as costo_ventas,
  count(*)          as cantidad_ventas
from sales
where status in ('confirmado','en_proceso','entregado')
group by 1;

-- Mano de obra por mes
create or replace view v_labor_monthly as
select date_trunc('month', prod_date)::date as period, sum(labor_total) as mano_obra
from production group by 1;

-- Compras de insumos por mes (recibidas)
create or replace view v_purchases_monthly as
select date_trunc('month', purchase_date)::date as period, sum(total) as compras_insumos
from purchases where status = 'recibido' group by 1;

-- Costos fijos por mes
create or replace view v_fixed_costs_monthly as
select period_month as period, sum(amount) as costos_fijos
from company_payments group by 1;

-- Flujo de caja consolidado (solo lectura — Regla 8)
create or replace view v_cash_flow as
with months as (
  select period from v_sales_monthly
  union select period from v_labor_monthly
  union select period from v_purchases_monthly
  union select period from v_fixed_costs_monthly
)
select
  m.period,
  coalesce(s.facturacion, 0)                                   as ingresos,
  coalesce(f.costos_fijos, 0)                                  as egresos_fijos,
  coalesce(l.mano_obra, 0)                                     as mano_obra,
  coalesce(pu.compras_insumos, 0)                              as compras_insumos,
  coalesce(s.facturacion,0)
    - coalesce(f.costos_fijos,0)
    - coalesce(l.mano_obra,0)
    - coalesce(pu.compras_insumos,0)                           as saldo_mensual
from months m
left join v_sales_monthly     s  on s.period  = m.period
left join v_fixed_costs_monthly f on f.period = m.period
left join v_labor_monthly     l  on l.period  = m.period
left join v_purchases_monthly pu on pu.period = m.period
order by m.period;

-- Cuentas por cobrar (ventas confirmadas no cobradas)
create or replace view v_accounts_receivable as
select
  s.id, s.client_name, s.client_id, s.order_date, s.total,
  (current_date - s.order_date) as days_outstanding
from sales s
where s.status in ('confirmado','en_proceso','entregado')
  and s.paid = false;

-- Historial / TOP clientes
create or replace view v_client_history as
select
  c.id as client_id, c.name,
  count(s.id) as total_pedidos,
  coalesce(sum(s.total),0) as total_facturado,
  max(s.order_date) as ultima_compra
from clients c
left join sales s on s.client_id = c.id
  and s.status in ('confirmado','en_proceso','entregado')
group by c.id, c.name;

-- Análisis de márgenes por producto
create or replace view v_product_margins as
select
  si.product_id,
  si.product_name,
  sum(si.qty) as unidades_vendidas,
  sum(si.qty * si.unit_price) as facturado,
  sum(si.qty * (si.unit_price - si.unit_cost)) as margen_total
from sale_items si
join sales s on s.id = si.sale_id
where s.status in ('confirmado','en_proceso','entregado')
group by si.product_id, si.product_name;

-- ════════════════════════════════════════════════════════════════════════
--  SEGURIDAD (Row Level Security)
--  · Usuarios autenticados: leen todo, escriben operación diaria.
--  · Solo dueño: finanzas, precios, pagos empresa, administración.
--  · Anónimo (web pública): SOLO puede insertar pedidos web pendientes.
-- ════════════════════════════════════════════════════════════════════════
alter table profiles               enable row level security;
alter table suppliers              enable row level security;
alter table supplies               enable row level security;
alter table products               enable row level security;
alter table product_recipe         enable row level security;
alter table combo_components        enable row level security;
alter table clients                enable row level security;
alter table sales                  enable row level security;
alter table sale_items             enable row level security;
alter table purchases              enable row level security;
alter table production             enable row level security;
alter table engraving_orders        enable row level security;
alter table inventory_adjustments   enable row level security;
alter table company_payments        enable row level security;

-- Perfiles: cada uno ve/edita el suyo; el dueño ve todos
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or public.is_owner());
drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid() or public.is_owner());

-- Helper macro vía políticas explícitas por tabla.
-- Lectura para cualquier autenticado:
do $$
declare t text;
begin
  foreach t in array array['suppliers','supplies','products','product_recipe',
      'combo_components','clients','sales','sale_items','purchases','production',
      'engraving_orders','inventory_adjustments','company_payments']
  loop
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('create policy %I_read on %I for select to authenticated using (true);', t, t);
  end loop;
end $$;

-- Escritura de operación diaria (cualquier autenticado): ventas, items,
-- compras, producción, grabados, mermas, clientes.
do $$
declare t text;
begin
  foreach t in array array['sales','sale_items','purchases','production',
      'engraving_orders','inventory_adjustments','clients']
  loop
    execute format('drop policy if exists %I_write on %I;', t, t);
    execute format('create policy %I_write on %I for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- Escritura SOLO dueño: catálogo, insumos, proveedores, ficha técnica,
-- combos, pagos empresa.
do $$
declare t text;
begin
  foreach t in array array['products','supplies','suppliers','product_recipe',
      'combo_components','company_payments']
  loop
    execute format('drop policy if exists %I_write_owner on %I;', t, t);
    execute format('create policy %I_write_owner on %I for all to authenticated using (public.is_owner()) with check (public.is_owner());', t, t);
  end loop;
end $$;

-- WEB PÚBLICA (anon): puede crear un pedido web pendiente y sus ítems.
-- No puede leer precios mayoristas ni nada más.
drop policy if exists sales_web_insert on sales;
create policy sales_web_insert on sales for insert to anon
  with check (source = 'web' and status = 'pendiente');

drop policy if exists sale_items_web_insert on sale_items;
create policy sale_items_web_insert on sale_items for insert to anon
  with check (true);

-- ════════════════════════════════════════════════════════════════════════
--  REALTIME (para que el dashboard se actualice solo)
-- ════════════════════════════════════════════════════════════════════════
do $$
begin
  begin
    alter publication supabase_realtime add table sales;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table sale_items;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table production;
  exception when others then null; end;
  begin
    alter publication supabase_realtime add table purchases;
  exception when others then null; end;
end $$;

-- FIN del esquema. Ahora ejecutá seed.sql para cargar el catálogo real.
