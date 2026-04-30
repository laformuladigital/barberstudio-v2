# n8n

## Flujos recomendados

- confirmacion de cita
- recordatorio 24 horas antes
- recordatorio 2 horas antes
- alerta de bloqueo pendiente
- resumen diario

## Regla

n8n no participa en el proceso critico de reservar. Solo automatiza tareas secundarias.

## Integracion recomendada

- Supabase genera eventos en `automation_events`.
- n8n debe consultar eventos con `processed_at is null`.
- Cada workflow procesa su evento y luego marca `processed_at`.
- Si n8n esta caido, las reservas siguen funcionando y los eventos quedan pendientes.

## Eventos iniciales

- `appointment.created`: confirmacion de cita.
- `appointment.status_changed`: mensajes posteriores si aplica.
- `schedule_block.pending`: alerta al admin para aprobar o rechazar bloqueos.

## VPS

Archivos:

- `n8n/.env.example`: plantilla de entorno sin secretos.
- `infra/systemd/n8n.service`: servicio systemd separado de la app web.
- `scripts/n8n-provision.sh`: instala n8n y registra el servicio.

Comando:

```bash
bash /var/www/barberstudio-v2/scripts/n8n-provision.sh
nano /etc/barberstudio/n8n.env
systemctl start n8n
```

No ejecutar este paso antes de que la app web y Supabase esten validados.
