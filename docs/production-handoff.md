# Estado actual de produccion

## Ubicaciones

- Local vivo: `C:\Deploy\Barberappoficial\barberstudio-v2`
- Entrega/diseno: `C:\Deploy\Barberappoficial\barberappstudio oficial`
- GitHub: `https://github.com/laformuladigital/barberstudio-v2`
- Produccion: `https://barberappstudio.com`
- VPS: `root@177.7.52.248`
- Ruta VPS: `/var/www/barberstudio-v2`
- Supabase project ref: `wssvhqdneeopezhkjmfl`

## Mejoras implementadas

- Reserva publica por RPC.
- Proteccion anti-cruce en base de datos.
- Login, registro, recuperar contraseña.
- Redireccion por rol.
- Menu publico limpio sin mostrar admin/barbero a visitantes.
- Panel cliente con perfil editable y foto.
- Panel barbero con agenda.
- Panel admin por categorias.
- Gestion de roles por RPC.
- Gestion de servicios y barberos por RPC admin.
- Realtime para refrescar agenda.
- Deploy reproducible en VPS.
- SSL con Certbot reaplicado automaticamente en deploy.
- Home cinematografico dark/silver/glass.
- Logo BarberStudio actualizado en Home, header y favicon.
- Reserva inmersiva por pasos con politica obligatoria antes de confirmar.
- Perfiles de barbero con foto principal y galeria de trabajos.
- Perfil cliente con descripcion/preferencias e inasistencias.
- Penalizacion simple por no-show.
- Admin compacto con horarios filtrables por barbero y dia.

## Memoria de continuidad

Para continuar el proyecto despues de compactar contexto, usar:

- `docs/PROJECT_MEMORY_2026-05-04.md`

## Seguridad

- No hay llaves privadas en frontend.
- No se usa `service_role` en la app.
- RLS esta activo en tablas publicas.
- Acciones sensibles usan RPC.
- n8n no es dependencia del flujo principal de reserva.

## Pendientes operativos

- Si las fotos de perfil no suben, aplicar `supabase/migrations/017_profile_avatars_storage.sql`.
- En Supabase Auth mantener redirects:
  - `https://barberappstudio.com/reset-password`
  - `http://localhost:5173/reset-password`

## Nota sobre errores del dashboard Supabase

Si el dashboard de Supabase muestra "client-side exception", normalmente es un problema temporal del panel web de Supabase o cache del navegador. No implica que BarberStudio este roto. Validar siempre la app en `https://barberappstudio.com`.
