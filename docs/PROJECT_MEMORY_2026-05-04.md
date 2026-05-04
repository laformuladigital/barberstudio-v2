# BarberStudio v2 - Memoria operativa

Fecha de cierre de contexto: 2026-05-04

## Resumen ejecutivo

BarberStudio v2 esta funcionando en produccion como app de reservas para barberia sobre:

- Hostinger VPS
- Supabase Auth/Postgres/RLS/RPC/Realtime
- React + Vite + TypeScript + Tailwind
- n8n como automatizacion secundaria, nunca como dependencia de reserva

Dominio objetivo y activo:

- `https://barberappstudio.com`
- `https://www.barberappstudio.com`

## Rutas y accesos operativos

- Proyecto local principal: `C:\Deploy\Barberappoficial\barberstudio-v2`
- Carpeta de entrega/diseno: `C:\Deploy\Barberappoficial\barberappstudio oficial`
- GitHub: `https://github.com/laformuladigital/barberstudio-v2`
- Rama viva: `main`
- VPS: `root@177.7.52.248`
- Alias SSH usado: `barberstudio-vps`
- Ruta en VPS: `/var/www/barberstudio-v2`
- Supabase project ref: `wssvhqdneeopezhkjmfl`
- Dominio de marca: `barberappstudio.com`

No guardar aqui passwords, llaves privadas, `service_role` ni secretos.

## Cuentas admin esperadas

Los usuarios admin definidos para el proyecto son:

- `laformuladigitaloficial@gmail.com`
- `anderson@barberappstudio.com`

La asignacion real se maneja en Supabase mediante `public.user_roles`. Si se crea una cuenta nueva, debe existir el perfil y luego asignarse rol admin/barbero/cliente desde el panel admin o por SQL/RPC.

## Estado funcional actual

### Reserva publica

- Ruta: `/reservar`
- Flujo actual:
  1. Servicio
  2. Barbero
  3. Horario
  4. Datos
  5. Confirmacion con checkbox de politica
- El frontend solo presenta opciones.
- La disponibilidad se calcula por RPC `get_available_slots`.
- La reserva se crea por RPC `book_appointment`.
- La base evita cruces con exclusion constraint en `appointments`.

### Cliente

- Ruta: `/cliente`
- Perfil editable:
  - nombre
  - celular
  - foto
  - descripcion/preferencias
- Puede ver reservas asociadas.
- Cancelacion bloqueada si faltan menos de 2 horas.

### Barbero

- Ruta: `/barbero`
- Agenda diaria.
- Puede confirmar, completar y marcar no-show.
- Puede editar su perfil sin pedir permiso:
  - foto principal
  - bio
  - especialidades
  - galeria de trabajos
- La edicion se hace por RPC `update_my_barber_profile`, no por update libre.

### Admin

- Ruta: `/admin`
- Secciones:
  - Operacion
  - Agenda
  - Catalogo
  - Horarios
  - Accesos
  - Bloqueos
- Catalogo gestiona servicios y barberos.
- Horarios gestiona `availability_rules` con filtros por barbero y dia.
- Accesos gestiona roles y vinculacion de usuarios a barberos.

## Ultimos commits importantes

- `f9053ee` - Compact admin schedule management
- `46da592` - Refine booking interaction and admin schedules
- `501fa12` - Improve profiles media and booking flow
- `62673b2` - Document production workflow and deploy helper
- `e729884` - Update BarberStudio logo assets
- `05ff8fa` - Simplify cinematic home hero
- `879226e` - Apply luxury glass visual direction

## Archivos clave

### Frontend

- Home: `apps/web/src/features/home/HomePage.tsx`
- Layout/nav: `apps/web/src/app/layouts/AppLayout.tsx`
- Router: `apps/web/src/app/router/AppRouter.tsx`
- Login/auth: `apps/web/src/features/auth/LoginPage.tsx`
- Recuperar password: `apps/web/src/features/auth/ResetPasswordPage.tsx`
- Reserva: `apps/web/src/features/booking/BookingPage.tsx`
- Cliente: `apps/web/src/features/client/ClientPage.tsx`
- Barbero: `apps/web/src/features/barber/BarberPage.tsx`
- Admin: `apps/web/src/features/admin/AdminPage.tsx`
- API Supabase: `apps/web/src/lib/bookingApi.ts`
- Estilos globales: `apps/web/src/styles/globals.css`

### Supabase

- Migraciones: `supabase/migrations`
- SQL limpio completo: `docs/supabase-clean-setup.sql`
- Fotos/perfiles/penalizaciones: `supabase/migrations/018_profiles_media_penalties.sql`

### Deploy

- Deploy rapido completo: `scripts/save-and-deploy.ps1`
- Sync VPS: `scripts/vps-sync.ps1`
- Deploy en VPS: `scripts/deploy.sh`
- Provision VPS: `scripts/vps-provision.sh`
- Nginx: `infra/nginx/barberappstudio.conf`

## Deploy recomendado

Desde `C:\Deploy\Barberappoficial\barberstudio-v2`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\save-and-deploy.ps1 -Message "Describe el cambio"
```

Ese script:

- ejecuta lint
- ejecuta build
- crea commit
- sube a GitHub
- sincroniza VPS
- ejecuta deploy remoto
- valida healthcheck HTTPS

Para guardar sin desplegar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\save-and-deploy.ps1 -Message "Describe el cambio" -SkipDeploy
```

## Validacion manual rapida

```powershell
cd C:\Deploy\Barberappoficial\barberstudio-v2\apps\web
npm run lint
npm run build
```

Healthcheck produccion:

```powershell
(Invoke-WebRequest -UseBasicParsing https://barberappstudio.com/).StatusCode
```

## Reglas que no se deben romper

- No poner logica critica de agenda solo en frontend.
- No usar `service_role` en frontend.
- Mantener RLS activo.
- Acciones sensibles por RPC.
- n8n no puede ser dependencia del flujo principal de reserva.
- No hacer multi-sede completa todavia, pero mantener el modelo preparado.
- Mantener `barberappstudio.com` como dominio objetivo.
- Validar seguridad, permisos y deploy antes de cerrar cambios.

## Estilo visual vigente

Direccion visual actual:

- dark luxury
- cinematic
- black/silver/white
- liquid glass
- bordes cristal
- UI compacta y premium
- evitar recuadros innecesarios o navegacion ambigua

No redisenar desde cero. Mejorar sobre la app viva.

## Recursos visuales

Assets activos:

- `apps/web/public/home-horizontal-clean.png`
- `apps/web/public/home-vertical-clean.png`
- `apps/web/public/logo-barberstudio-blanco.png`
- `apps/web/public/favicon.png`

La carpeta `docs/Recursos/` esta ignorada por Git para materiales pesados o temporales.

## Pendientes recomendados

Prioridad alta:

- Revisar en celular el flujo `/reservar` despues de cada cambio visual.
- Mejorar textos puntuales sin cambiar arquitectura.
- Mantener admin compacto y operacional.

Prioridad media:

- Agregar enlaces sociales controlados para barberia/barberos.
- Agregar link de Google Reviews como configuracion simple.
- Mejorar filtros de agenda por estado/barbero en admin.

Prioridad baja:

- Automatizaciones n8n para recordatorios.
- Reportes simples por ingresos, no-show y ocupacion.
- Preparar multi-sede real cuando el negocio lo pida.

## Estado del repo al cerrar memoria

El repo debe quedar limpio con `git status --short` vacio despues de guardar este documento.

