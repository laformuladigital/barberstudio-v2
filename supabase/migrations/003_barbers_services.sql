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
