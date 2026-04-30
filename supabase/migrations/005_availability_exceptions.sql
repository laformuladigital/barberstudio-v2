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

