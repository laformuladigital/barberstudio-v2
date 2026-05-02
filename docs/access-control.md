# Accesos y cuentas

## Cuentas iniciales

No hay passwords hardcodeados en el repo. Las cuentas se crean con Supabase Auth desde `/login`.

Flujo recomendado:

1. Crea tu cuenta de dueño/admin desde `/login` en modo registro.
2. En Supabase, ejecuta el bootstrap de admin una sola vez.
3. Entra a `/admin`.
4. Pide a cada barbero que cree su cuenta desde `/login`.
5. Desde `/admin`, usa `Accesos` para asignar rol `barbero` y vincular su perfil de barbero.

## Bootstrap del primer admin

Despues de registrar tu usuario, busca tu correo y ejecuta esto en Supabase SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from public.profiles
where email = 'TU_EMAIL_ADMIN'
on conflict (user_id, role) do nothing;
```

Cambia `TU_EMAIL_ADMIN` por tu correo real.

## Roles

- `cliente`: puede ver sus citas asociadas a cuenta y cancelar por RPC.
- `barbero`: puede ver su agenda, cambiar estados permitidos y solicitar bloqueos.
- `admin`: puede ver la operacion completa, asignar roles y vincular barberos.

## Crear acceso a barberos

1. El barbero se registra con su email en `/login`.
2. El admin entra a `/admin`.
3. En el modulo `Accesos`, selecciona al usuario.
4. Asigna rol `barbero`.
5. Completa nombre publico, especialidades y bio.
6. Pulsa `Vincular como barbero`.

Las acciones sensibles usan RPC:

- `admin_set_user_role`
- `admin_remove_user_role`
- `admin_link_barber`

## Operacion diaria de roles y cuentas

- Para convertir un usuario en barbero: el usuario se registra, el admin entra a `/admin`, asigna rol `barbero` y luego lo vincula como barbero.
- Para quitar acceso: el admin usa `Accesos` y elimina el rol correspondiente.
- Para admin adicional: primero el usuario se registra; luego un admin existente le asigna rol `admin`.
- Para recuperar contraseña: el usuario usa `/login`, opcion `Recuperar`.
- Para editar perfil: el usuario entra a `/cliente` y actualiza nombre, celular y foto.

## Seguridad

- El frontend no escribe roles directamente.
- Los roles se gestionan con RPC y auditoria.
- El primer admin se crea manualmente para evitar cuentas admin automaticas.
- No se guardan passwords ni llaves privadas en el repositorio.
