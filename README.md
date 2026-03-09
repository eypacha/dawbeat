# DawBeat

DAW experimental para componer con fórmulas bytebeat sobre un timeline.

La app ya no está sólo en fase de mock UI: hoy incluye timeline editable, reproducción bytebeat real en navegador y un flujo base de composición por clips.

## Estado actual

Implementado hoy:

- timeline con tracks y clips
- reproducción real con Web Audio + `ByteBeat.js`
- play, pause, stop y loop
- playhead sincronizado con el tiempo actual
- creación de clips por drag sobre un track vacío
- edición inline de fórmula por clip
- mover clips dentro del track y entre tracks
- resize de inicio y fin de clip
- duplicado con `Alt/Option + drag`
- bypass temporal de snap con `Shift + drag`
- mute por track
- rename, color y borrado de tracks por menú contextual

Todavía pendiente:

- biblioteca de fórmulas real
- presets e historial
- automatizaciones
- visualizaciones
- edición avanzada de fórmulas fuera del clip

## Stack

- Vue 3
- Vite
- Tailwind CSS
- Pinia
- Web Audio API
- `public/vendors/ByteBeat.js` como backend bytebeat actual

## Cómo correrlo

```bash
pnpm install
pnpm dev
```

Build de producción:

```bash
pnpm build
```

## Interacciones actuales

- `Click` sobre clip: selecciona
- `Double click` sobre clip: edita fórmula inline
- `Drag` sobre clip: mueve con snap activo
- `Shift + drag` sobre clip: mueve sin snap
- `Alt/Option + drag` sobre clip: muestra fantasma y duplica al soltar
- `Drag` entre tracks: mueve el clip al track destino
- `Drag` sobre handles laterales: resize
- `Shift + drag` durante resize: resize sin snap
- `Drag` en espacio vacío del track: crea clip
- `Shift + drag` al crear: creación sin snap
- `Delete` o `Backspace`: borra clip seleccionado

## Reglas del timeline

- El snap a grid está activo por defecto.
- `Shift` desactiva el snap sólo mientras se mantiene presionado durante el gesto.
- `Alt/Option` no duplica al hacer `pointerdown`; la copia se confirma en `pointerup`.
- Los tracks muteados se ven con menor opacidad y no participan en la fórmula activa.
- La fórmula activa del timeline se compone uniendo las fórmulas de los clips activos de tracks no muteados.

## Estructura actual

```text
src/
  components/
    boot/
    library/
    timeline/
    transport/
    ui/
  composables/
    useContextMenu.js
    useTransportPlayback.js
  engine/
    timelineEngine.js
  services/
    bytebeatService.js
    timelineService.js
  stores/
    dawStore.js
  utils/
    colorUtils.js
    timeUtils.js
```

## Arquitectura actual

La app hoy trabaja con esta cadena:

```text
UI
↓
Pinia Store
↓
Services / Composables
↓
Timeline Engine
↓
Bytebeat Service
↓
Web Audio
```

`timelineEngine` decide qué fórmula está activa para el tiempo actual.

`bytebeatService` inicializa `ByteBeatNode`, actualiza expresiones y controla reproducción, pausa, stop y seek.

## Estado del editor de fórmulas

La columna izquierda todavía es un placeholder visual. La edición real de fórmulas hoy vive dentro de cada clip.

Si se implementa un editor lateral, debe sincronizarse con `selectedClipId` y actualizar el store sin duplicar lógica.

## Objetivo inmediato

Consolidar la experiencia de composición en timeline:

- mejorar la biblioteca/editor de fórmulas
- mantener el timeline modular
- seguir agregando interacción sin romper drag, resize, loop ni playback

## Referencia bytebeat

Ejemplo de fórmula válida:

```js
t * (t >> 5 | t >> 8)
```

La variable esperada por el sistema es `t`.
