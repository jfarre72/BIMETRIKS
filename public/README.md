# public/

Archivos estáticos servidos en la raíz del sitio.

## Logo de BiMetriks

Para usar el logo oficial, subí el archivo acá con uno de estos nombres:

- **`logo.svg`** (preferido) — vectorial, fondo transparente. Se ve nítido en cualquier tamaño.
- **`logo.png`** — fondo transparente, aprox. 400×120 px (alto ~120). 

El sistema lo detecta automáticamente (primero busca `logo.svg`, luego `logo.png`)
y lo muestra en el sidebar y en el login. Si no encontrás ninguno, se usa el
isotipo dibujado por defecto. El alto se ajusta solo a 32px de alto.

Cómo subirlo:
1. En GitHub, entrá a la carpeta `public/`.
2. "Add file" → "Upload files" → arrastrá tu `logo.svg` (o `logo.png`).
3. Commit. En el próximo deploy aparece el logo.
