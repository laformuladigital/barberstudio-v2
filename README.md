# BarberStudio v2

BarberStudio v2 es una app de reservas para barberias desplegada en `barberappstudio.com` con `Hostinger VPS + Supabase + n8n`.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Supabase Auth + Postgres + Realtime
- n8n para automatizaciones
- Nginx para despliegue

## Estructura

- `apps/web`: frontend
- `supabase/migrations`: esquema y reglas
- `n8n/workflows`: automatizaciones
- `infra/nginx`: configuracion de servidor
- `scripts`: despliegue y verificacion
- `docs`: documentacion operativa

## Arranque local

```bash
cd apps/web
npm install
cp ../../.env.example .env.local
npm run dev
```

## Dominio de produccion

- `https://barberappstudio.com`

## Rutas importantes

- Proyecto local vivo: `C:\Deploy\Barberappoficial\barberstudio-v2`
- Carpeta de entrega/diseno: `C:\Deploy\Barberappoficial\barberappstudio oficial`
- GitHub: `https://github.com/laformuladigital/barberstudio-v2`
- VPS: `root@177.7.52.248`
- Ruta VPS: `/var/www/barberstudio-v2`

## Cambios rapidos de texto o diseno

1. Edita los archivos en `apps/web/src/features`.
2. Valida:

```bash
cd apps/web
npm run lint
npm run build
```

3. Guarda, sube y despliega:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\save-and-deploy.ps1 -Message "Update site copy"
```

Para cambios de textos del Home:

- `apps/web/src/features/home/HomePage.tsx`

Para login:

- `apps/web/src/features/auth/LoginPage.tsx`

## Memoria de continuidad

Antes de compactar un chat o pasar el proyecto a otra persona, revisar:

- `docs/PROJECT_MEMORY_2026-05-04.md`
- `docs/production-handoff.md`
- `docs/deploy.md`
- `docs/architecture.md`
