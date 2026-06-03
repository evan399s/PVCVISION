# PVCVision 🔧

Visor **3D interactivo** de piezas de PVC para fontanería: muestra cada
accesorio (fitting), **cómo se unen**, **cómo se reducen** de diámetro y qué
piezas necesitas para montajes típicos como el **sifón de un lavabo**.

Todo funciona en el navegador con [Three.js](https://threejs.org/) cargado
desde CDN — **no hace falta instalar nada ni compilar**.

## 🚀 Cómo ejecutarlo

Como usa módulos ES, debe servirse por HTTP (no abriendo el archivo directamente).

**Windows (lo más fácil):** haz doble clic en **`abrir-pvcvision.bat`**. Usa un
mini servidor en **PowerShell** (ya incluido en Windows, **no necesita instalar
Python ni Node**), abre el navegador solo en `http://127.0.0.1:8000` y, para
parar, cierra la ventana negra.

**Manualmente** (si prefieres Python/Node), desde la carpeta del proyecto:

```bash
# Opción 1: Python (suele venir instalado)
python3 -m http.server 8000

# Opción 2: Node
npx serve .
```

Luego abre **http://localhost:8000** en el navegador.

## 🧩 Qué incluye

### Piezas individuales (catálogo)
- **Tubo recto** — conduce el agua, se corta a medida.
- **Codo 90° / 45°** — cambia la dirección.
- **Te (T) / Cruz** — une ramales a una conducción principal.
- **Reducción** — pasa de un diámetro grande a uno menor.
- **Manguito / unión** — empalma dos tubos del mismo diámetro.
- **Tapón** — cierra un extremo.
- **Sifón (en U)** — retiene agua y bloquea los olores.
- **Válvula de desagüe** — la rejilla del lavabo/fregadero.

Cada pieza muestra **para qué sirve** y **cómo se une**.

### Montajes guiados (con lista de materiales y pasos)
- **Sifón de lavabo** — válvula → tubo → sifón → tubo → codo a la pared.
- **Desagüe de fregadero (2 senos)** — dos válvulas unidas con una Te a un sifón.
- **Cómo reducir diámetro** — uso correcto de la reducción.
- **Cómo unir dos tubos** — uso del manguito.

El control **Despiece** separa las piezas del montaje para ver el orden de unión.

## 🎮 Controles del visor
- **Arrastrar** = rotar la cámara.
- **Rueda** = zoom.
- **Clic derecho + arrastrar** = desplazar.
- **↻ Girar** = autorrotación.
- **⤢ Encuadrar** = centra la pieza.

## 🗂️ Estructura

```
index.html          Página principal + importmap de Three.js
css/styles.css      Estilos de la interfaz
js/pvc-parts.js     Generadores 3D de cada pieza + catálogo
js/assemblies.js    Montajes predefinidos (BOM, pasos, posiciones)
js/main.js          Escena, cámara, controles y lógica de la UI
```

## 🛠️ Cómo añadir una pieza nueva
1. Crea un generador en `js/pvc-parts.js` que devuelva un `THREE.Group`.
2. Regístralo en el objeto `CATALOG` con `nombre`, `uso`, `union` y `bocas`.
3. Aparecerá automáticamente en el menú lateral.

## 📌 Notas técnicas
- Unidades: **1 unidad ≈ 1 cm**; diámetro nominal por defecto ~40 mm.
- Las piezas son geometría procedural (huecas, con campana de unión visible).
- Pensado como herramienta didáctica/visual, no como plano de fabricación.
