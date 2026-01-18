## 05_tips: workflow shortcuts

- **Redeploy rápido**: `npx vercel --prod --force` ciega un nuevo despliegue sin abrir la UI.  
- **Logs**: `npx vercel logs chef-v2 --since 1h --prod` muestra errores recientes.  
- **Test data en loop**: correr `bootstrap.sql` + pruebas + `cleanup.sql`.  
- **Repositorio**: si quieres una copia aislada, clona `main` y usa `automation` como referencia para cada nuevo workspace.  
- **Dark mode**: la app ya usa variables css para fondos (#0b1220). Si necesitas un “modo ultra oscuro” añade más gradientes en `src/index.css` o ajusta `--bg` a `0 0 0` en `src/styles/theme.css`.
