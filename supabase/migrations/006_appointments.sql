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

