# Integraciones externas

- **Supabase Auth**: login con email/Password, JWT, reglas RLS (seguridad total).
- **RPCs**: `dashboard_rolling_grid`, `dashboard_event_highlights`, `import_commit`, `validate_space_org_consistency`, etc. Son llamadas serverless desde frontend.
- **OCR Importer**: se conecta a función `ocr_process/enqueue` para procesar imágenes/Excel y extraer líneas.
- **Vercel**: deploy continua, variables de entorno (SUPABASE_URL, SUPABASE_KEY, VITE_GEMINI_API_KEY).
- **Gemini / IA**: prompts para staff briefing/producción (planificación y alertas).
- **Notificaciones**: alertas en UI (toasts, banners) cuando se detectan caducidad, shortages o errores.
- **Stripe / pagos**: placeholder (no implementado pero en visión para cuentas de proveedor).
