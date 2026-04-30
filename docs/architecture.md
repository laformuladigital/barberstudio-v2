# Arquitectura

## Dominio

- Produccion: `https://barberappstudio.com`

## Componentes

- Frontend React servido desde el VPS
- Supabase para Auth, Postgres, RLS, Realtime y RPC
- n8n para recordatorios y tareas programadas
- Nginx como reverse proxy y servidor estatico

## Regla critica

Las citas no deben cruzarse. La base de datos es responsable de garantizarlo.

## Modelo listo para crecer

- `studio_locations` existe desde el MVP para dejar preparada la evolucion a multi-sede.
- La version actual opera una sede primaria; la UI no expone multi-sede completa todavia.
- Barberos y servicios pueden asociarse a una sede sin cambiar el flujo de reserva actual.

## Limites de responsabilidad

- El frontend presenta opciones y ejecuta RPC.
- Supabase valida disponibilidad, permisos y estados sensibles.
- n8n observa datos y dispara tareas secundarias, pero no confirma ni crea reservas.
