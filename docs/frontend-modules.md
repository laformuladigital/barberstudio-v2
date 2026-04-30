# Modulos frontend

## `src/lib/bookingApi.ts`

Responsabilidad:

- Centraliza lecturas publicas de servicios y barberos.
- Ejecuta RPC sensibles: `get_available_slots`, `book_appointment`, cambios de estado, cancelacion y bloqueos.
- Evita SQL o reglas de negocio criticas dentro de componentes React.

No debe:

- Calcular disponibilidad final en frontend.
- Escribir directamente en `appointments` para reservas o cambios de estado.
- Usar llaves privadas de Supabase.

## Features

- `features/booking`: reserva publica sin cuenta obligatoria. Consume slots por RPC y crea reservas por RPC.
- `features/auth`: login y registro con Supabase Auth.
- `features/client`: historial y cancelacion controlada por RPC.
- `features/barber`: agenda diaria, estados de cita y solicitud de bloqueos.
- `features/admin`: agenda general, metricas operativas y aprobacion de bloqueos.
