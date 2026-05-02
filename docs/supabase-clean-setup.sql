-- BarberStudio v2 clean setup. Paste into Supabase SQL Editor and run once.

-- >>> docs/supabase-reset-prefix.sql
-- BarberStudio v2 clean reset for Supabase SQL Editor
-- WARNING: This drops public schema objects. Use only if this project has no production data yet.

begin;

drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;

commit;

-- >>> supabase/migrations/001_extensions_and_enums.sql
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('cliente', 'barbero', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
  end if;

  if not exists (select 1 from pg_type where typname = 'block_status') then
    create type public.block_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;


-- >>> supabase/migrations/002_profiles_and_roles.sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);

create table if not exists public.studio_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  timezone text not null default 'America/Bogota',
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_studio_locations_one_primary
on public.studio_locations(is_primary)
where is_primary = true;

-- >>> supabase/migrations/003_barbers_services.sql
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.studio_locations(id) on delete restrict,
  user_id uuid unique references public.profiles(id) on delete set null,
  display_name text not null,
  bio text,
  specialties text[] not null default '{}',
  rating numeric(3,2) not null default 5.0 check (rating >= 0 and rating <= 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.studio_locations(id) on delete restrict,
  name text not null,
  description text,
  duration_min integer not null check (duration_min between 15 and 360),
  buffer_min integer not null default 10 check (buffer_min between 0 and 120),
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_barbers_user_id on public.barbers(user_id);
create index if not exists idx_barbers_location_active on public.barbers(location_id, is_active);
create index if not exists idx_services_location_active on public.services(location_id, active, order_index);

-- >>> supabase/migrations/004_availability_rules.sql
create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_interval_min integer not null default 30 check (slot_interval_min between 5 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists idx_availability_rules_barber_day on public.availability_rules(barber_id, day_of_week);


-- >>> supabase/migrations/005_availability_exceptions.sql
create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  local_date date not null,
  start_time time,
  end_time time,
  reason text,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    is_closed = true or (start_time is not null and end_time is not null and end_time > start_time)
  )
);

create index if not exists idx_availability_exceptions_barber_date on public.availability_exceptions(barber_id, local_date);


-- >>> supabase/migrations/006_appointments.sql
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete set null,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  guest_name text,
  guest_phone text,
  guest_email text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  local_date date not null,
  status public.appointment_status not null default 'pending',
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (client_id is not null or (guest_name is not null and guest_phone is not null)),
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);

create index if not exists idx_appointments_barber_starts on public.appointments(barber_id, starts_at);
create index if not exists idx_appointments_client_starts on public.appointments(client_id, starts_at);


-- >>> supabase/migrations/007_schedule_blocks.sql
create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  local_date date not null,
  reason text,
  status public.block_status not null default 'pending',
  requested_by uuid references public.profiles(id) on delete set null,
  decided_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'approved')
);

create index if not exists idx_schedule_blocks_barber_starts on public.schedule_blocks(barber_id, starts_at);


-- >>> supabase/migrations/008_client_notes.sql
create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references public.profiles(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_notes_profile on public.client_notes(client_profile_id, created_at desc);


-- >>> supabase/migrations/009_audit_logs.sql
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id, created_at desc);


-- >>> supabase/migrations/010_rls.sql
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.studio_locations enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.appointments enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.client_notes enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.has_role(p_user_id uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where p_user_id = auth.uid()
      and user_id = auth.uid()
      and role = p_role
  );
$$;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "roles_select_own_or_admin" on public.user_roles;
create policy "roles_select_own_or_admin"
on public.user_roles for select
to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "roles_admin_manage" on public.user_roles;
create policy "roles_admin_manage"
on public.user_roles for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "locations_public_read_active" on public.studio_locations;
create policy "locations_public_read_active"
on public.studio_locations for select
to anon, authenticated
using (is_active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "locations_admin_manage" on public.studio_locations;
create policy "locations_admin_manage"
on public.studio_locations for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "barbers_public_read_active" on public.barbers;
create policy "barbers_public_read_active"
on public.barbers for select
to anon, authenticated
using (is_active = true or public.has_role(auth.uid(), 'admin') or user_id = auth.uid());

drop policy if exists "barbers_admin_manage" on public.barbers;
create policy "barbers_admin_manage"
on public.barbers for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "services_public_read_active" on public.services;
create policy "services_public_read_active"
on public.services for select
to anon, authenticated
using (active = true or public.has_role(auth.uid(), 'admin'));

drop policy if exists "services_admin_manage" on public.services;
create policy "services_admin_manage"
on public.services for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "availability_rules_public_read" on public.availability_rules;
create policy "availability_rules_public_read"
on public.availability_rules for select
to anon, authenticated
using (true);

drop policy if exists "availability_rules_admin_manage" on public.availability_rules;
create policy "availability_rules_admin_manage"
on public.availability_rules for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "availability_exceptions_select_related" on public.availability_exceptions;
create policy "availability_exceptions_select_related"
on public.availability_exceptions for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin') or
  exists (select 1 from public.barbers b where b.id = availability_exceptions.barber_id and b.user_id = auth.uid())
);

drop policy if exists "availability_exceptions_admin_manage" on public.availability_exceptions;
create policy "availability_exceptions_admin_manage"
on public.availability_exceptions for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "appointments_select_related" on public.appointments;
create policy "appointments_select_related"
on public.appointments for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin') or
  client_id = auth.uid() or
  exists (select 1 from public.barbers b where b.id = appointments.barber_id and b.user_id = auth.uid())
);

drop policy if exists "appointments_delete_admin" on public.appointments;
create policy "appointments_delete_admin"
on public.appointments for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "schedule_blocks_select_related" on public.schedule_blocks;
create policy "schedule_blocks_select_related"
on public.schedule_blocks for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin') or
  exists (select 1 from public.barbers b where b.id = schedule_blocks.barber_id and b.user_id = auth.uid())
);

drop policy if exists "schedule_blocks_admin_manage" on public.schedule_blocks;
create policy "schedule_blocks_admin_manage"
on public.schedule_blocks for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "client_notes_admin_or_barber_read" on public.client_notes;
create policy "client_notes_admin_or_barber_read"
on public.client_notes for select
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'barbero'));

drop policy if exists "client_notes_admin_or_barber_write" on public.client_notes;
create policy "client_notes_admin_or_barber_write"
on public.client_notes for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'barbero'));

drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read"
on public.audit_logs for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- >>> supabase/migrations/011_rpc_functions.sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;

  insert into public.user_roles (user_id, role)
  values (new.id, 'cliente')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.local_slot_to_timestamptz(p_local_date date, p_slot_time time)
returns timestamptz
language sql
immutable
as $$
  select (p_local_date + p_slot_time) at time zone 'America/Bogota';
$$;

create or replace function public.get_available_slots(
  p_barber_id uuid,
  p_service_id uuid,
  p_local_date date
)
returns table(slot_time time, starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duration integer;
  v_buffer integer;
  v_interval integer;
  v_total integer;
  v_day integer;
begin
  select s.duration_min, coalesce(s.buffer_min, 0)
  into v_duration, v_buffer
  from public.services s
  where s.id = p_service_id and s.active = true;

  if v_duration is null then
    raise exception 'Servicio no disponible.';
  end if;

  v_total := v_duration + v_buffer;
  v_day := extract(dow from p_local_date)::integer;

  return query
  with windows as (
    select r.start_time, r.end_time, r.slot_interval_min
    from public.availability_rules r
    join public.barbers b on b.id = r.barber_id
    where r.barber_id = p_barber_id
      and r.day_of_week = v_day
      and r.is_active = true
      and b.is_active = true
  ),
  candidates as (
    select
      gs::time as slot_time,
      public.local_slot_to_timestamptz(p_local_date, gs::time) as starts_at,
      public.local_slot_to_timestamptz(p_local_date, (gs + make_interval(mins => v_total))::time) as ends_at
    from windows w,
    lateral generate_series(
      p_local_date::timestamp + w.start_time,
      p_local_date::timestamp + (w.end_time - make_interval(mins => v_total)),
      make_interval(mins => w.slot_interval_min)
    ) gs
  )
  select c.slot_time, c.starts_at, c.ends_at
  from candidates c
  where c.starts_at > now()
    and not exists (
      select 1 from public.appointments a
      where a.barber_id = p_barber_id
        and a.status in ('pending', 'confirmed')
        and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)')
    )
    and not exists (
      select 1 from public.schedule_blocks b
      where b.barber_id = p_barber_id
        and b.status = 'approved'
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)')
    )
    and not exists (
      select 1 from public.availability_exceptions e
      where e.barber_id = p_barber_id
        and e.local_date = p_local_date
        and (
          e.is_closed = true or
          tstzrange(
            public.local_slot_to_timestamptz(p_local_date, e.start_time),
            public.local_slot_to_timestamptz(p_local_date, e.end_time),
            '[)'
          ) && tstzrange(c.starts_at, c.ends_at, '[)')
        )
    )
  order by c.starts_at;
end;
$$;

create or replace function public.book_appointment(
  p_barber_id uuid,
  p_service_id uuid,
  p_local_date date,
  p_slot_time time,
  p_guest_name text default null,
  p_guest_phone text default null,
  p_guest_email text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid := auth.uid();
  v_duration integer;
  v_buffer integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_id uuid;
begin
  if v_client_id is null and (nullif(trim(coalesce(p_guest_name, '')), '') is null or nullif(trim(coalesce(p_guest_phone, '')), '') is null) then
    raise exception 'Nombre y celular son obligatorios para reservar sin cuenta.';
  end if;

  select duration_min, coalesce(buffer_min, 0)
  into v_duration, v_buffer
  from public.services
  where id = p_service_id and active = true;

  if v_duration is null then
    raise exception 'Servicio no disponible.';
  end if;

  v_starts_at := public.local_slot_to_timestamptz(p_local_date, p_slot_time);
  v_ends_at := v_starts_at + make_interval(mins => v_duration + v_buffer);

  if not exists (
    select 1 from public.get_available_slots(p_barber_id, p_service_id, p_local_date) s where s.slot_time = p_slot_time
  ) then
    raise exception 'Ese horario ya no esta disponible.';
  end if;

  insert into public.appointments (
    client_id,
    barber_id,
    service_id,
    guest_name,
    guest_phone,
    guest_email,
    starts_at,
    ends_at,
    local_date,
    notes,
    created_by
  ) values (
    v_client_id,
    p_barber_id,
    p_service_id,
    nullif(trim(coalesce(p_guest_name, '')), ''),
    nullif(trim(coalesce(p_guest_phone, '')), ''),
    nullif(trim(coalesce(p_guest_email, '')), ''),
    v_starts_at,
    v_ends_at,
    p_local_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_client_id
  ) returning id into v_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (v_client_id, 'appointment', v_id, 'booked', jsonb_build_object('barber_id', p_barber_id, 'service_id', p_service_id));

  return v_id;
exception
  when exclusion_violation then
    raise exception 'Ese horario ya no esta disponible.';
end;
$$;

create or replace function public.confirm_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para confirmar esta cita.';
  end if;

  update public.appointments set status = 'confirmed' where id = p_appointment_id;
  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action) values (v_user_id, 'appointment', p_appointment_id, 'confirmed');
end;
$$;

create or replace function public.complete_appointment(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para completar esta cita.';
  end if;

  update public.appointments set status = 'completed' where id = p_appointment_id;
  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action) values (v_user_id, 'appointment', p_appointment_id, 'completed');
end;
$$;

create or replace function public.mark_no_show(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para marcar esta cita.';
  end if;

  update public.appointments set status = 'no_show' where id = p_appointment_id;
  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action) values (v_user_id, 'appointment', p_appointment_id, 'no_show');
end;
$$;

create or replace function public.cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.appointments a where a.id = p_appointment_id and a.client_id = v_user_id) or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para cancelar esta cita.';
  end if;

  update public.appointments set status = 'cancelled' where id = p_appointment_id;
  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (v_user_id, 'appointment', p_appointment_id, 'cancelled', jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_local_date date,
  p_slot_time time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_barber_id uuid;
  v_service_id uuid;
  v_duration integer;
  v_buffer integer;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  select a.barber_id, a.service_id, s.duration_min, coalesce(s.buffer_min, 0)
  into v_barber_id, v_service_id, v_duration, v_buffer
  from public.appointments a
  join public.services s on s.id = a.service_id
  where a.id = p_appointment_id
    and a.status in ('pending', 'confirmed');

  if v_barber_id is null then
    raise exception 'Cita no disponible para reprogramar.';
  end if;

  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.appointments a where a.id = p_appointment_id and a.client_id = v_user_id) or
    exists (select 1 from public.barbers b where b.id = v_barber_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para reprogramar esta cita.';
  end if;

  if not exists (
    select 1 from public.get_available_slots(v_barber_id, v_service_id, p_local_date) s where s.slot_time = p_slot_time
  ) then
    raise exception 'Ese horario ya no esta disponible.';
  end if;

  v_starts_at := public.local_slot_to_timestamptz(p_local_date, p_slot_time);
  v_ends_at := v_starts_at + make_interval(mins => v_duration + v_buffer);

  update public.appointments
  set starts_at = v_starts_at, ends_at = v_ends_at, local_date = p_local_date
  where id = p_appointment_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action)
  values (v_user_id, 'appointment', p_appointment_id, 'rescheduled');
exception
  when exclusion_violation then
    raise exception 'Ese horario ya no esta disponible.';
end;
$$;

create or replace function public.request_schedule_block(
  p_barber_id uuid,
  p_local_date date,
  p_start_time time,
  p_end_time time,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_minutes integer;
  v_status public.block_status;
  v_id uuid;
begin
  if p_end_time <= p_start_time then
    raise exception 'La hora final debe ser mayor a la inicial.';
  end if;

  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers where id = p_barber_id and user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso sobre esta agenda.';
  end if;

  v_starts_at := public.local_slot_to_timestamptz(p_local_date, p_start_time);
  v_ends_at := public.local_slot_to_timestamptz(p_local_date, p_end_time);
  v_minutes := extract(epoch from (v_ends_at - v_starts_at))::integer / 60;
  v_status := case when public.has_role(v_user_id, 'admin') or v_minutes <= 90 then 'approved'::public.block_status else 'pending'::public.block_status end;

  insert into public.schedule_blocks (barber_id, starts_at, ends_at, local_date, reason, status, requested_by)
  values (p_barber_id, v_starts_at, v_ends_at, p_local_date, nullif(trim(coalesce(p_reason, '')), ''), v_status, v_user_id)
  returning id into v_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action)
  values (v_user_id, 'schedule_block', v_id, 'requested');

  return v_id;
exception
  when exclusion_violation then
    raise exception 'Ese bloqueo cruza con otro bloqueo aprobado.';
end;
$$;

create or replace function public.approve_schedule_block(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not public.has_role(v_user_id, 'admin') then
    raise exception 'Solo admin puede aprobar bloqueos.';
  end if;

  update public.schedule_blocks
  set status = 'approved', decided_by = v_user_id
  where id = p_block_id and status = 'pending';

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action)
  values (v_user_id, 'schedule_block', p_block_id, 'approved');
exception
  when exclusion_violation then
    raise exception 'Ese bloqueo cruza con otro bloqueo aprobado.';
end;
$$;

create or replace function public.reject_schedule_block(p_block_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if not public.has_role(v_user_id, 'admin') then
    raise exception 'Solo admin puede rechazar bloqueos.';
  end if;

  update public.schedule_blocks
  set status = 'rejected', decided_by = v_user_id
  where id = p_block_id and status = 'pending';

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (v_user_id, 'schedule_block', p_block_id, 'rejected', jsonb_build_object('reason', p_reason));
end;
$$;

grant execute on function public.get_available_slots(uuid, uuid, date) to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, date, time, text, text, text, text) to anon, authenticated;
grant execute on function public.confirm_appointment(uuid) to authenticated;
grant execute on function public.complete_appointment(uuid) to authenticated;
grant execute on function public.mark_no_show(uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, date, time) to authenticated;
grant execute on function public.request_schedule_block(uuid, date, time, time, text) to authenticated;
grant execute on function public.approve_schedule_block(uuid) to authenticated;
grant execute on function public.reject_schedule_block(uuid, text) to authenticated;

-- >>> supabase/migrations/012_seed.sql
insert into public.studio_locations (name, slug, address, is_primary, is_active)
values ('Barber Studio Principal', 'principal', 'barberappstudio.com', true, true)
on conflict (slug) do update
set name = excluded.name,
    address = excluded.address,
    is_primary = true,
    is_active = true;

insert into public.barbers (location_id, display_name, bio, specialties, rating, is_active)
values
  ((select id from public.studio_locations where slug = 'principal'), 'Fernando', 'Cortes clasicos y acabados limpios.', array['Clasico', 'Barba'], 5.0, true),
  ((select id from public.studio_locations where slug = 'principal'), 'Elvis', 'Especialista en fade y lineas.', array['Fade', 'Lineas'], 5.0, true),
  ((select id from public.studio_locations where slug = 'principal'), 'Anderson', 'Corte ejecutivo y asesoria de estilo.', array['Ejecutivo', 'Barba'], 5.0, true)
on conflict do nothing;

insert into public.services (location_id, name, description, duration_min, buffer_min, price_cents, active, order_index)
values
  ((select id from public.studio_locations where slug = 'principal'), 'Corte premium', 'Corte, perfilado y styling final.', 45, 10, 4500000, true, 1),
  ((select id from public.studio_locations where slug = 'principal'), 'Corte + barba', 'Servicio completo con barba.', 60, 10, 6500000, true, 2),
  ((select id from public.studio_locations where slug = 'principal'), 'Barba luxury', 'Perfilado premium.', 30, 5, 3000000, true, 3)
on conflict do nothing;

insert into public.availability_rules (barber_id, day_of_week, start_time, end_time, slot_interval_min, is_active)
select b.id, d.day_of_week, time '09:00', time '13:00', 30, true
from public.barbers b
cross join (values (1), (2), (3), (4), (5), (6)) as d(day_of_week)
where not exists (
  select 1 from public.availability_rules r
  where r.barber_id = b.id and r.day_of_week = d.day_of_week and r.start_time = time '09:00'
);

insert into public.availability_rules (barber_id, day_of_week, start_time, end_time, slot_interval_min, is_active)
select b.id, d.day_of_week, time '14:00', time '19:00', 30, true
from public.barbers b
cross join (values (1), (2), (3), (4), (5), (6)) as d(day_of_week)
where not exists (
  select 1 from public.availability_rules r
  where r.barber_id = b.id and r.day_of_week = d.day_of_week and r.start_time = time '14:00'
);

-- >>> supabase/migrations/013_realtime.sql
alter table public.appointments replica identity full;
alter table public.schedule_blocks replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.appointments;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.schedule_blocks;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- >>> supabase/migrations/014_automation_outbox.sql
create table if not exists public.automation_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_events_pending
on public.automation_events(created_at)
where processed_at is null;

alter table public.automation_events enable row level security;

drop policy if exists "automation_events_admin_read" on public.automation_events;
create policy "automation_events_admin_read"
on public.automation_events for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "automation_events_admin_update" on public.automation_events;
create policy "automation_events_admin_update"
on public.automation_events for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.enqueue_appointment_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.automation_events (event_type, entity_type, entity_id, payload)
    values (
      'appointment.created',
      'appointment',
      new.id,
      jsonb_build_object('appointment_id', new.id, 'starts_at', new.starts_at, 'barber_id', new.barber_id, 'service_id', new.service_id)
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.automation_events (event_type, entity_type, entity_id, payload)
    values (
      'appointment.status_changed',
      'appointment',
      new.id,
      jsonb_build_object('appointment_id', new.id, 'old_status', old.status, 'new_status', new.status, 'starts_at', new.starts_at)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_automation_outbox on public.appointments;
create trigger appointments_automation_outbox
after insert or update on public.appointments
for each row execute function public.enqueue_appointment_automation();

create or replace function public.enqueue_block_automation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    insert into public.automation_events (event_type, entity_type, entity_id, payload)
    values (
      'schedule_block.pending',
      'schedule_block',
      new.id,
      jsonb_build_object('block_id', new.id, 'starts_at', new.starts_at, 'ends_at', new.ends_at, 'barber_id', new.barber_id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists schedule_blocks_automation_outbox on public.schedule_blocks;
create trigger schedule_blocks_automation_outbox
after insert on public.schedule_blocks
for each row execute function public.enqueue_block_automation();

-- >>> supabase/migrations/015_admin_access_management.sql
create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Solo admin puede asignar roles.';
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'El usuario no existe en profiles.';
  end if;

  insert into public.user_roles (user_id, role)
  values (p_user_id, p_role)
  on conflict (user_id, role) do nothing;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (auth.uid(), 'user_role', p_user_id, 'role_assigned', jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_remove_user_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Solo admin puede retirar roles.';
  end if;

  if p_user_id = auth.uid() and p_role = 'admin' then
    raise exception 'No puedes retirarte tu propio rol admin.';
  end if;

  delete from public.user_roles
  where user_id = p_user_id and role = p_role;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (auth.uid(), 'user_role', p_user_id, 'role_removed', jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_link_barber(
  p_user_id uuid,
  p_display_name text,
  p_bio text default null,
  p_specialties text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location_id uuid;
  v_barber_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Solo admin puede vincular barberos.';
  end if;

  if nullif(trim(coalesce(p_display_name, '')), '') is null then
    raise exception 'El nombre visible del barbero es obligatorio.';
  end if;

  select id into v_location_id
  from public.studio_locations
  where is_primary = true and is_active = true
  limit 1;

  if v_location_id is null then
    raise exception 'No hay sede primaria activa.';
  end if;

  perform public.admin_set_user_role(p_user_id, 'barbero');

  insert into public.barbers (location_id, user_id, display_name, bio, specialties, is_active)
  values (
    v_location_id,
    p_user_id,
    trim(p_display_name),
    nullif(trim(coalesce(p_bio, '')), ''),
    coalesce(p_specialties, '{}'),
    true
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      bio = excluded.bio,
      specialties = excluded.specialties,
      is_active = true,
      updated_at = now()
  returning id into v_barber_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (auth.uid(), 'barber', v_barber_id, 'barber_linked', jsonb_build_object('user_id', p_user_id));

  return v_barber_id;
end;
$$;

grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_remove_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_link_barber(uuid, text, text, text[]) to authenticated;

-- >>> supabase/migrations/016_admin_catalog_management.sql
create or replace function public.admin_upsert_service(
  p_service_id uuid default null,
  p_name text default null,
  p_description text default null,
  p_duration_min integer default 45,
  p_buffer_min integer default 10,
  p_price_cents integer default 0,
  p_active boolean default true,
  p_order_index integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location_id uuid;
  v_service_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Solo admin puede gestionar servicios.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'El nombre del servicio es obligatorio.';
  end if;

  if p_duration_min < 15 or p_duration_min > 360 then
    raise exception 'La duracion debe estar entre 15 y 360 minutos.';
  end if;

  if p_buffer_min < 0 or p_buffer_min > 120 then
    raise exception 'El buffer debe estar entre 0 y 120 minutos.';
  end if;

  if p_price_cents < 0 then
    raise exception 'El precio no puede ser negativo.';
  end if;

  select id into v_location_id
  from public.studio_locations
  where is_primary = true and is_active = true
  limit 1;

  if v_location_id is null then
    raise exception 'No hay sede primaria activa.';
  end if;

  if p_service_id is null then
    insert into public.services (location_id, name, description, duration_min, buffer_min, price_cents, active, order_index)
    values (v_location_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_duration_min, p_buffer_min, p_price_cents, p_active, p_order_index)
    returning id into v_service_id;
  else
    update public.services
    set name = trim(p_name),
        description = nullif(trim(coalesce(p_description, '')), ''),
        duration_min = p_duration_min,
        buffer_min = p_buffer_min,
        price_cents = p_price_cents,
        active = p_active,
        order_index = p_order_index,
        updated_at = now()
    where id = p_service_id
    returning id into v_service_id;

    if v_service_id is null then
      raise exception 'Servicio no encontrado.';
    end if;
  end if;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (auth.uid(), 'service', v_service_id, 'upserted', jsonb_build_object('name', p_name));

  return v_service_id;
end;
$$;

create or replace function public.admin_upsert_barber(
  p_barber_id uuid default null,
  p_display_name text default null,
  p_bio text default null,
  p_specialties text[] default '{}',
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location_id uuid;
  v_barber_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Solo admin puede gestionar barberos.';
  end if;

  if nullif(trim(coalesce(p_display_name, '')), '') is null then
    raise exception 'El nombre visible del barbero es obligatorio.';
  end if;

  select id into v_location_id
  from public.studio_locations
  where is_primary = true and is_active = true
  limit 1;

  if v_location_id is null then
    raise exception 'No hay sede primaria activa.';
  end if;

  if p_barber_id is null then
    insert into public.barbers (location_id, display_name, bio, specialties, is_active)
    values (v_location_id, trim(p_display_name), nullif(trim(coalesce(p_bio, '')), ''), coalesce(p_specialties, '{}'), p_is_active)
    returning id into v_barber_id;
  else
    update public.barbers
    set display_name = trim(p_display_name),
        bio = nullif(trim(coalesce(p_bio, '')), ''),
        specialties = coalesce(p_specialties, '{}'),
        is_active = p_is_active,
        updated_at = now()
    where id = p_barber_id
    returning id into v_barber_id;

    if v_barber_id is null then
      raise exception 'Barbero no encontrado.';
    end if;
  end if;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (auth.uid(), 'barber', v_barber_id, 'upserted', jsonb_build_object('display_name', p_display_name));

  return v_barber_id;
end;
$$;

grant execute on function public.admin_upsert_service(uuid, text, text, integer, integer, integer, boolean, integer) to authenticated;
grant execute on function public.admin_upsert_barber(uuid, text, text, text[], boolean) to authenticated;

-- Profile avatar storage.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Recreate profiles for users already registered before the schema reset.
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do update set email = excluded.email, full_name = coalesce(public.profiles.full_name, excluded.full_name);

-- Existing users get cliente role by default.
insert into public.user_roles (user_id, role)
select id, 'cliente'::public.app_role from public.profiles
on conflict (user_id, role) do nothing;

-- Assign initial admins.
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from public.profiles
where email in ('laformuladigitaloficial@gmail.com', 'anderson@barberappstudio.com')
on conflict (user_id, role) do nothing;

select p.email, r.role
from public.user_roles r
join public.profiles p on p.id = r.user_id
where p.email in ('laformuladigitaloficial@gmail.com', 'anderson@barberappstudio.com')
order by p.email, r.role;
