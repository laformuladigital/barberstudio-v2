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
