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
