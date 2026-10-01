# Observatorio arbitral — uso e integridad

## Abrir la web
1. **Recomendado (para que el hash funcione):** en esta carpeta del proyecto ejecuta:
   ```bash
   npx --yes serve observatorio-arbitral -p 4173
   ```
   Luego abre http://localhost:4173
2. Alternativa: doble clic en `index.html` (la verificación SHA puede fallar por `file://`; los datos visibles siguen ahí).

## Anti-edición (qué significa)
- Los visitantes **no pueden guardar cambios** en tus archivos desde el navegador.
- Sí pueden trucar **su** pantalla con F12. Por eso existe el **SHA-256** en `data/INTEGRITY.txt`.
- Si alguien te pasa una copia alterada del JSON, el hash **no coincidirá**.

## Regenerar sellado tras editar datos
```bash
node sellar-integridad.js
```
Actualiza también el `meta name="dataset-sha256"` en `index.html` si cambias el JSON.

## Excel
`../Analisis_Arbitraje_Titulos_Referencias_2001-2018.xlsx` — hojas 9 (FFP) y 10 (Integridad).
