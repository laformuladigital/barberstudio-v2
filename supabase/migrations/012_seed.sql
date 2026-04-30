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
