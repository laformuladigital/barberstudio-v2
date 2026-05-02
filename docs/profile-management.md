# Gestion de perfiles

## Responsabilidad

El modulo de perfil permite que cada usuario mantenga su informacion basica sin intervención del admin:

- Nombre visible.
- Celular.
- Foto de perfil publica.

## Seguridad

- Los datos viven en `public.profiles`.
- RLS permite que cada usuario actualice solo su propio perfil.
- Admin puede consultar perfiles para operar roles y accesos.
- Las fotos viven en el bucket `avatars`.
- El bucket es publico solo para lectura de imagenes.
- La escritura de fotos esta limitada por RLS a la carpeta del usuario autenticado: `{auth.uid()}/...`.
- El frontend limita imagenes a 1 MB y tipos de imagen.

## Operacion

- Un cliente actualiza su perfil desde `/cliente`.
- Un barbero tambien puede usar `/cliente` como su cuenta personal, y `/barbero` para agenda.
- Un admin puede asignar roles desde `/admin`, pero no necesita editar manualmente la foto del usuario.

## Supabase Auth

Para registro, confirmacion de correo y recuperacion de contraseña:

- Site URL: `https://barberappstudio.com`
- Redirect URLs:
  - `https://barberappstudio.com/reset-password`
  - `http://localhost:5173/reset-password`

La recuperacion usa `resetPasswordForEmail` y luego `updateUser({ password })` en `/reset-password`.
