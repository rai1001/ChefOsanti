## 04_cleanup: remove synthetic data

1. **Ejecuta** `automation/sql/cleanup.sql` después de cada ciclo de pruebas para vaciar los datos sintéticos.  
2. **Verifica** que las tablas estén vacías con `select count(*)...` para `events`, `hotels`, etc.  
3. **Opcional**: si necesitas restablecer claves o redeploy, sigue nuevamente los pasos de `01_setup` y `02_secrets`.  
4. **Notas**: mantén el `.vercel` y el baseline en `main`; la limpieza solo afecta los datos (no el esquema ni los tokens).
