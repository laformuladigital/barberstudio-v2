# Barber self-service and booking pipeline

## Responsabilidad
Este modulo cubre dos mejoras de BarberStudio v2:

- Reserva publica por etapas: servicio, barbero, horario y datos, con una pantalla principal por paso.
- Autonomia del barbero: edicion de perfil, fotos de trabajos, bloqueos y horarios propios sin acceso admin.

## Frontend
Archivos principales:

- `apps/web/src/features/booking/BookingPage.tsx`: flujo de reserva inmersivo por etapa.
- `apps/web/src/features/barber/BarberPage.tsx`: perfil editable, galeria, agenda y horarios propios del barbero.
- `apps/web/src/features/admin/AdminPage.tsx`: adjuntos de foto para servicios y barberos desde catalogo.
- `apps/web/src/lib/bookingApi.ts`: funciones RPC y helpers de Storage.

## Base de datos
Nueva migracion:

- `supabase/migrations/019_barber_self_availability.sql`
- `supabase/migrations/020_barber_cancel_own_appointments.sql`

La migracion agrega `public.upsert_my_availability_rule(...)`, un RPC `security definer` que:

- Obtiene el barbero vinculado a `auth.uid()`.
- Valida dia, rango horario e intervalo.
- Inserta o actualiza solo horarios del propio barbero.
- Registra auditoria en `audit_logs`.
- Expone ejecucion solo a `authenticated`.

No cambia ni borra datos existentes.

La migracion `020` agrega `public.barber_cancel_appointment(...)`, para que el barbero pueda cancelar citas de su propia agenda sin depender del permiso admin. Valida que la cita pertenezca al barbero autenticado y registra auditoria.

## Seguridad
- La reserva publica sigue usando `book_appointment` y `get_available_slots`; no hay logica critica solo en frontend.
- Los horarios propios del barbero se escriben por RPC, no por update libre desde el cliente.
- Las fotos se suben con Supabase Storage usando buckets existentes: `barber-media` y `service-media`.
- El frontend no usa `service_role`.

## Despliegue
Antes de desplegar el frontend, aplica las migraciones `019_barber_self_availability.sql` y `020_barber_cancel_own_appointments.sql` en Supabase.

Despues:

```powershell
.\scripts\save-and-deploy.ps1 -Message "Improve booking pipeline and barber self service"
```

Si solo quieres guardar cambios sin VPS:

```powershell
.\scripts\save-and-deploy.ps1 -Message "Improve booking pipeline and barber self service" -SkipDeploy
```
