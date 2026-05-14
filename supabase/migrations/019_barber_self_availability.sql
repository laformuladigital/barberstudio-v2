create or replace function public.upsert_my_availability_rule(
  p_rule_id uuid default null,
  p_day_of_week integer default 1,
  p_start_time time default '09:00',
  p_end_time time default '19:00',
  p_slot_interval_min integer default 30,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_barber_id uuid;
  v_rule_id uuid;
begin
  select id into v_barber_id
  from public.barbers
  where user_id = v_user_id
  limit 1;

  if v_barber_id is null then
    raise exception 'Tu cuenta no esta vinculada a un perfil de barbero.';
  end if;

  if p_day_of_week < 0 or p_day_of_week > 6 then
    raise exception 'El dia debe estar entre 0 y 6.';
  end if;

  if p_end_time <= p_start_time then
    raise exception 'La hora final debe ser mayor a la inicial.';
  end if;

  if p_slot_interval_min < 5 or p_slot_interval_min > 120 then
    raise exception 'El intervalo debe estar entre 5 y 120 minutos.';
  end if;

  if p_rule_id is null then
    insert into public.availability_rules (barber_id, day_of_week, start_time, end_time, slot_interval_min, is_active)
    values (v_barber_id, p_day_of_week, p_start_time, p_end_time, p_slot_interval_min, p_is_active)
    returning id into v_rule_id;
  else
    update public.availability_rules
    set day_of_week = p_day_of_week,
        start_time = p_start_time,
        end_time = p_end_time,
        slot_interval_min = p_slot_interval_min,
        is_active = p_is_active,
        updated_at = now()
    where id = p_rule_id
      and barber_id = v_barber_id
    returning id into v_rule_id;

    if v_rule_id is null then
      raise exception 'Horario no encontrado para tu perfil.';
    end if;
  end if;

  insert into public.audit_logs (actor_user_id, entity_type, entity_id, action, payload)
  values (
    v_user_id,
    'availability_rule',
    v_rule_id,
    'self_upserted',
    jsonb_build_object('day_of_week', p_day_of_week, 'start_time', p_start_time, 'end_time', p_end_time)
  );

  return v_rule_id;
end;
$$;

grant execute on function public.upsert_my_availability_rule(uuid, integer, time, time, integer, boolean) to authenticated;
