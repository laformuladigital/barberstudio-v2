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
