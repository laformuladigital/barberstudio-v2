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
