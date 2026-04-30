# Codex Master Prompt

Construye BarberStudio v2 sobre este repo sin salirte de estas reglas:

1. No rompas la arquitectura `Hostinger VPS + Supabase + n8n`.
2. No metas herramientas nuevas salvo que sean estrictamente necesarias.
3. No pongas la logica critica de agenda solo en frontend.
4. Usa RPC y RLS para acciones sensibles.
5. Mantén el dominio objetivo como `barberappstudio.com`.
6. La prioridad es:
   - reservas sin cruces
   - panel admin util
   - panel barbero claro
   - cliente simple
   - deploy reproducible
7. No conviertas `n8n` en dependencia del flujo principal de reserva.
8. Si agregas un modulo nuevo, documenta su responsabilidad en `docs/`.
9. No hagas multi-sede completa ahora, pero deja el modelo listo para crecer.
10. Antes de dar por terminado un cambio, valida seguridad, permisos y despliegue.

## Orden de trabajo sugerido

1. Conectar el frontend a Supabase
2. Implementar reserva publica
3. Implementar auth
4. Implementar panel cliente
5. Implementar panel barbero
6. Implementar panel admin
7. Integrar realtime
8. Integrar n8n
9. Endurecer deploy

