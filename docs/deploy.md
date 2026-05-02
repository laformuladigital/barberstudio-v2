# Deploy en Hostinger VPS

## Ruta sugerida

`/var/www/barberstudio-v2`

## Pasos

1. Apuntar `barberappstudio.com` y `www.barberappstudio.com` al VPS.
2. Sincronizar archivos desde local:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\vps-sync.ps1 -HostName 177.7.52.248 -User root
```

3. Crear el archivo de entorno en el VPS:

```bash
ssh root@177.7.52.248
bash /var/www/barberstudio-v2/scripts/vps-create-env.sh
nano /var/www/barberstudio-v2/.env.production
```

4. Provisionar Nginx, Node y Certbot:

```bash
bash /var/www/barberstudio-v2/scripts/vps-provision.sh
```

5. Compilar y activar la app:

```bash
bash /var/www/barberstudio-v2/scripts/deploy.sh
```

6. Activar SSL cuando DNS ya resuelva al VPS:

```bash
CERTBOT_EMAIL=admin@barberappstudio.com ENABLE_SSL=1 bash /var/www/barberstudio-v2/scripts/vps-provision.sh
```

## Validacion previa

- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` deben existir.
- No se debe publicar ninguna llave `service_role`.
- Supabase Auth debe tener `https://barberappstudio.com` como `site_url`.
- Los redirects deben incluir `https://barberappstudio.com`, `https://www.barberappstudio.com` y `http://localhost:5173`.
- El build debe generar `apps/web/dist` antes de recargar Nginx.

## Archivos de soporte VPS

- `.env.production.example`: plantilla sin secretos.
- `.deployignore`: evita subir `node_modules`, builds y envs locales.
- `scripts/vps-sync.ps1`: empaqueta y sube el repo desde Windows.
- `scripts/vps-create-env.sh`: crea `.env.production` en el VPS con permisos seguros.
- `scripts/vps-provision.sh`: instala base del VPS y configura Nginx.
- `scripts/deploy.sh`: instala dependencias, compila, activa Nginx y ejecuta healthcheck.
- `scripts/save-and-deploy.ps1`: valida, guarda cambios en GitHub, sincroniza VPS y despliega.
- `scripts/n8n-provision.sh`: instala n8n como servicio separado.

## Flujo recomendado para cambios futuros

Desde `C:\Deploy\Barberappoficial\barberstudio-v2`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\save-and-deploy.ps1 -Message "Describe el cambio"
```

Ese flujo hace:

- `npm run lint`
- `npm run build`
- `git add`
- `git commit`
- `git push origin main`
- sync al VPS
- `bash /var/www/barberstudio-v2/scripts/deploy.sh`
- healthcheck HTTPS

## Cambios de texto en vivo

Los textos no se editan directamente en el VPS. Se cambian localmente, se suben a GitHub y se despliegan.

Archivos comunes:

- Home: `apps/web/src/features/home/HomePage.tsx`
- Login: `apps/web/src/features/auth/LoginPage.tsx`
- Reserva: `apps/web/src/features/booking/BookingPage.tsx`
- Cliente: `apps/web/src/features/client/ClientPage.tsx`
- Barbero: `apps/web/src/features/barber/BarberPage.tsx`
- Admin: `apps/web/src/features/admin/AdminPage.tsx`
