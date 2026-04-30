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

