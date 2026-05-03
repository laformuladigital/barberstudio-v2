alter table public.profiles add column if not exists description text;
alter table public.profiles add column if not exists no_show_count integer not null default 0 check (no_show_count >= 0);

alter table public.barbers add column if not exists avatar_url text;
alter table public.barbers add column if not exists gallery_urls text[] not null default '{}';

alter table public.services add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('barber-media', 'barber-media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('service-media', 'service-media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "barber_media_public_read" on storage.objects;
create policy "barber_media_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'barber-media');

drop policy if exists "barber_media_authenticated_upload" on storage.objects;
create policy "barber_media_authenticated_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'barber-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "barber_media_owner_update" on storage.objects;
create policy "barber_media_owner_update"
on storage.objects for update
to authenticated
using (bucket_id = 'barber-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'barber-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "service_media_public_read" on storage.objects;
create policy "service_media_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'service-media');

drop policy if exists "service_media_admin_upload" on storage.objects;
create policy "service_media_admin_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'service-media' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "service_media_admin_update" on storage.objects;
create policy "service_media_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'service-media' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'service-media' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "barbers_update_own_profile" on public.barbers;

create or replace function public.update_my_barber_profile(
  p_barber_id uuid,
  p_display_name text,
  p_bio text default null,
  p_specialties text[] default '{}',
  p_avatar_url text default null,
  p_gallery_urls text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.barbers
    where id = p_barber_id
      and user_id = auth.uid()
  ) then
    raise exception 'No tienes permiso para editar este perfil.';
  end if;

  if nullif(trim(coalesce(p_display_name, '')), '') is null then
    raise exception 'El nombre visible del barbero es obligatorio.';
  end if;

  update public.barbers
  set display_name = trim(p_display_name),
      bio = nullif(trim(coalesce(p_bio, '')), ''),
      specialties = coalesce(p_specialties, '{}'),
      avatar_url = nullif(trim(coalesce(p_avatar_url, '')), ''),
      gallery_urls = coalesce(p_gallery_urls, '{}'),
      updated_at = now()
  where id = p_barber_id
    and user_id = auth.uid();

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action)
  values (auth.uid(), 'barber', p_barber_id, 'profile_updated');
end;
$$;

drop function if exists public.admin_upsert_service(uuid, text, text, integer, integer, integer, boolean, integer);
create or replace function public.admin_upsert_service(
  p_service_id uuid default null,
  p_name text default null,
  p_description text default null,
  p_duration_min integer default 45,
  p_buffer_min integer default 10,
  p_price_cents integer default 0,
  p_active boolean default true,
  p_order_index integer default 0,
  p_image_url text default null
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
    insert into public.services (location_id, name, description, duration_min, buffer_min, price_cents, active, order_index, image_url)
    values (v_location_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''), p_duration_min, p_buffer_min, p_price_cents, p_active, p_order_index, nullif(trim(coalesce(p_image_url, '')), ''))
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
        image_url = nullif(trim(coalesce(p_image_url, '')), ''),
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

drop function if exists public.admin_upsert_barber(uuid, text, text, text[], boolean);
create or replace function public.admin_upsert_barber(
  p_barber_id uuid default null,
  p_display_name text default null,
  p_bio text default null,
  p_specialties text[] default '{}',
  p_is_active boolean default true,
  p_avatar_url text default null,
  p_gallery_urls text[] default '{}'
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
    insert into public.barbers (location_id, display_name, bio, specialties, is_active, avatar_url, gallery_urls)
    values (v_location_id, trim(p_display_name), nullif(trim(coalesce(p_bio, '')), ''), coalesce(p_specialties, '{}'), p_is_active, nullif(trim(coalesce(p_avatar_url, '')), ''), coalesce(p_gallery_urls, '{}'))
    returning id into v_barber_id;
  else
    update public.barbers
    set display_name = trim(p_display_name),
        bio = nullif(trim(coalesce(p_bio, '')), ''),
        specialties = coalesce(p_specialties, '{}'),
        is_active = p_is_active,
        avatar_url = nullif(trim(coalesce(p_avatar_url, '')), ''),
        gallery_urls = coalesce(p_gallery_urls, '{}'),
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

create or replace function public.mark_no_show(p_appointment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_client_id uuid;
begin
  if not (
    public.has_role(v_user_id, 'admin') or
    exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id)
  ) then
    raise exception 'No tienes permiso para marcar esta cita.';
  end if;

  update public.appointments
  set status = 'no_show',
      updated_at = now()
  where id = p_appointment_id
    and status in ('pending', 'confirmed')
  returning client_id into v_client_id;

  if v_client_id is null and not found then
    raise exception 'Cita no disponible para marcar inasistencia.';
  end if;

  if v_client_id is not null then
    update public.profiles
    set no_show_count = no_show_count + 1,
        updated_at = now()
    where id = v_client_id;
  end if;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action)
  values (v_user_id, 'appointment', p_appointment_id, 'no_show');
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
  v_starts_at timestamptz;
  v_is_admin boolean;
  v_can_cancel boolean;
begin
  select a.starts_at into v_starts_at
  from public.appointments a
  where a.id = p_appointment_id
    and a.status in ('pending', 'confirmed');

  if v_starts_at is null then
    raise exception 'Cita no disponible para cancelar.';
  end if;

  v_is_admin := public.has_role(v_user_id, 'admin');
  v_can_cancel := v_is_admin
    or exists (select 1 from public.appointments a where a.id = p_appointment_id and a.client_id = v_user_id)
    or exists (select 1 from public.barbers b join public.appointments a on a.barber_id = b.id where a.id = p_appointment_id and b.user_id = v_user_id);

  if not v_can_cancel then
    raise exception 'No tienes permiso para cancelar esta cita.';
  end if;

  if not v_is_admin and v_starts_at <= now() + interval '2 hours' then
    raise exception 'Solo puedes cancelar con minimo 2 horas de anticipacion.';
  end if;

  update public.appointments
  set status = 'cancelled',
      updated_at = now()
  where id = p_appointment_id;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (v_user_id, 'appointment', p_appointment_id, 'cancelled', jsonb_build_object('reason', p_reason));
end;
$$;

grant execute on function public.admin_upsert_service(uuid, text, text, integer, integer, integer, boolean, integer, text) to authenticated;
grant execute on function public.admin_upsert_barber(uuid, text, text, text[], boolean, text, text[]) to authenticated;
grant execute on function public.update_my_barber_profile(uuid, text, text, text[], text, text[]) to authenticated;
grant execute on function public.mark_no_show(uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
