# Supabase

## Configuracion recomendada

- `site_url = https://barberappstudio.com`
- redirects:
  - `https://barberappstudio.com`
  - `https://www.barberappstudio.com`
  - `http://localhost:5173`

## Uso

- Auth para login y registro
- Postgres para datos y RPC
- Realtime para slots y agenda

## Seguridad y permisos

- RLS debe estar activo en tablas expuestas.
- La reserva publica usa `book_appointment`; el frontend no inserta en `appointments`.
- La disponibilidad se consulta con `get_available_slots`.
- Cambios de estado usan RPC: `confirm_appointment`, `complete_appointment`, `mark_no_show`, `cancel_appointment` y `reschedule_appointment`.
- Bloqueos usan RPC: `request_schedule_block`, `approve_schedule_block` y `reject_schedule_block`.
- La proteccion anti-cruce se sostiene con restricciones de exclusion GiST sobre `appointments` y `schedule_blocks`.
- Realtime se habilita para `appointments` y `schedule_blocks`; la UI lo usa para refrescar datos, no para decidir permisos.
- `automation_events` actua como outbox para n8n. No participa en la creacion de reservas.

## Modelo

- `studio_locations` prepara el modelo para multi-sede futuro.
- `barbers.location_id` y `services.location_id` apuntan a la sede sin obligar a exponer multi-sede en la UI actual.
