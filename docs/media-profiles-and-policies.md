# BarberStudio v2 - Perfiles, fotos y politicas

## Responsabilidad

Este modulo agrega contenido visual y control operativo sin cambiar el flujo principal de reserva:

- Fotos de servicios para que el cliente elija mejor.
- Foto principal y galeria de trabajos para cada barbero.
- Perfil de cliente con foto, descripcion y conteo de inasistencias.
- Cancelacion con minimo 2 horas de anticipacion para clientes y barberos.
- Marcado de `no_show` con penitencia simple: suma una inasistencia al perfil del cliente registrado.

## Base de datos

La migracion viva es:

`supabase/migrations/018_profiles_media_penalties.sql`

Antes de desplegar el frontend que usa estas mejoras, esa migracion debe estar aplicada en Supabase. No requiere resetear datos. Si algun dia se hace un reset limpio con `docs/supabase-clean-setup.sql`, despues corre tambien esta migracion para dejar fotos, perfiles y penalizaciones activos.

## Reservas sin cruces

La reserva sigue dependiendo de RPC:

- `get_available_slots` calcula cupos reales.
- `book_appointment` crea la cita.
- La exclusion en base de datos impide que dos reservas ocupen el mismo espacio.

El frontend solo muestra la experiencia por pasos; la seguridad sigue en Supabase.

## Fotos

Buckets publicos:

- `barber-media`: fotos de barberos y trabajos realizados.
- `service-media`: fotos de servicios.
- `avatars`: fotos de perfiles.

Las URLs publicas se guardan en las tablas. No se guarda ningun archivo sensible.

## Reseñas de Google

La integracion recomendada para una version siguiente es ligera:

1. Agregar el enlace publico de Google Business al home y al panel admin.
2. Si se necesita rating dinamico, usar una Edge Function o n8n programado para sincronizar la calificacion, nunca como parte obligatoria de la reserva.

## Links directos

El link publico principal para reservas es:

`https://barberappstudio.com/reservar`

Ese link puede ir en Instagram, WhatsApp, Google Business y codigos QR.
