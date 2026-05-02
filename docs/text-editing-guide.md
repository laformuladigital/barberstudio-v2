# Guia para cambiar textos y publicar

## Cambiar textos

Abre el proyecto local:

```text
C:\Deploy\Barberappoficial\barberstudio-v2
```

Archivos mas usados:

- Home: `apps/web/src/features/home/HomePage.tsx`
- Login: `apps/web/src/features/auth/LoginPage.tsx`
- Recuperar contraseña: `apps/web/src/features/auth/ResetPasswordPage.tsx`
- Reserva: `apps/web/src/features/booking/BookingPage.tsx`
- Cliente: `apps/web/src/features/client/ClientPage.tsx`
- Barbero: `apps/web/src/features/barber/BarberPage.tsx`
- Admin: `apps/web/src/features/admin/AdminPage.tsx`
- Header/Menu: `apps/web/src/app/layouts/AppLayout.tsx`

## Probar local

```powershell
cd C:\Deploy\Barberappoficial\barberstudio-v2\apps\web
npm run dev
```

Abrir:

```text
http://localhost:5173
```

## Publicar

Desde:

```powershell
cd C:\Deploy\Barberappoficial\barberstudio-v2
```

Ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\save-and-deploy.ps1 -Message "Cambio de textos"
```

## Reglas

- No editar directo en el VPS.
- No cambiar SQL para textos.
- No tocar `.env`.
- No tocar Supabase si solo se cambia contenido visual.
