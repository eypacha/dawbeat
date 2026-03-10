# DawBeat

DAW experimental para componer fórmulas bytebeat sobre un timeline con reproducción real en navegador.

La app ya no es una maqueta: hoy tiene timeline editable, motor de reproducción bytebeat, librería de fórmulas, efectos y persistencia de proyecto.

## Estado actual

Implementado hoy:

- reproducción real con Web Audio + `public/vendors/ByteBeat.js`
- transport con `play`, `pause`, `stop`, `loop` y scrub del playhead
- zoom horizontal del timeline con `Ctrl/Cmd + wheel`
- timeline con tracks y clips
- creación de clips por drag en espacio vacío
- mover clips dentro del track y entre tracks
- resize de inicio y fin de clip
- duplicado con `Alt/Option + drag`
- bypass temporal de snap con `Shift + drag`
- mute y solo por track
- rename, color y borrado de tracks
- librería de fórmulas real con alta, edición, borrado y selección
- drag de fórmulas desde la librería al timeline o a clips existentes
- clips con fórmula inline o referencia a `formulaId`
- edición de fórmulas por diálogo tanto para clips como para librería
- efectos de fórmula: `Stereo Offset`
- efectos de audio: `Delay`, `EQ`, `BitCrusher` y `Master Gain`
- persistencia automática en `localStorage`
- import/export de proyecto JSON
- export WAV offline

Pendiente o todavía acotado:

- más efectos de fórmula
- una biblioteca con presets/historial más curada
- automatizaciones
- paridad total entre efectos de reproducción en vivo y export offline

## Stack

- Vue 3
- Vite
- Tailwind CSS
- Pinia
- Web Audio API
- `public/vendors/ByteBeat.js`

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

- `Click` sobre clip: selecciona clip y track
- `Double click` sobre clip: abre edición de fórmula del clip
- `Drag` sobre clip: mueve con snap activo
- `Shift + drag` sobre clip: mueve sin snap
- `Alt/Option + drag` sobre clip: duplica al soltar
- `Drag` entre tracks: mueve el clip al track destino
- `Drag` sobre handles laterales: resize
- `Shift + drag` durante resize: resize sin snap
- `Drag` en espacio vacío del track: crea clip
- `Drag` de una fórmula desde Library al lane: crea clip referenciando esa fórmula
- `Drag` de una fórmula desde Library a un clip: reasigna la fórmula del clip
- `Click` en Library: selecciona fórmula
- `Double click` en Library: abre edición de fórmula de librería
- `Space`: play/pause
- `L`: toggle loop
- `Delete` o `Backspace`: borra clip seleccionado

## Reglas de playback

- El snap a grid está activo por defecto.
- `Shift` desactiva el snap sólo durante el gesto actual.
- `Alt/Option` confirma la duplicación en `pointerup`.
- Los tracks muteados no participan en la fórmula activa.
- Si existe al menos un track en solo, sólo los tracks `soloed` participan en la fórmula activa.
- La fórmula activa se construye resolviendo clips activos audibles y combinándolos en `timelineEngine`.
- El export WAV hoy renderiza timeline + eval effects + `masterGain`; no replica la cadena completa de efectos de audio en vivo.

## Persistencia

- Al iniciar, la app intenta cargar el proyecto guardado en `localStorage`.
- Si no existe uno guardado, parte de `src/data/demo.json`.
- Desde el transport se puede:
  - crear proyecto vacío
  - abrir JSON
  - guardar JSON
  - exportar WAV
  - resetear storage local desde Settings

## Estructura actual

```text
src/
  components/
    boot/
    effects/
    library/
    timeline/
    transport/
    ui/
  composables/
    useContextMenu.js
    useTimelineClipInteraction.js
    useTransportPlayback.js
  engine/
    timelineEngine.js
  services/
    audioEffectService.js
    bytebeatService.js
    dawStoreService.js
    evalEffectService.js
    exportService.js
    formulaService.js
    keyboardShortcuts.js
    notifications.js
    projectPersistence.js
    snapService.js
    timelineService.js
    trackPlaybackState.js
  stores/
    dawStore.js
  utils/
    audioSettings.js
    colorUtils.js
    formulaTokenizer.js
    formulaValidation.js
    macroNodes.js
    timeUtils.js
```

## Arquitectura actual

```text
UI
↓
Pinia Store
↓
Services / Composables
↓
Timeline Engine
↓
Bytebeat Service / Export / Persistence
↓
Web Audio / File APIs / localStorage
```

`timelineEngine` decide la fórmula activa según tiempo, tracks audibles y fórmulas resueltas.

`bytebeatService` controla audio en vivo, sample rate, master gain y cadena de efectos de audio.

## Modelos principales

Track:

```js
{
  id: "track-id",
  color: "#6366f1",
  muted: false,
  soloed: false,
  name: undefined,
  clips: []
}
```

Clip:

```js
{
  id: "clip-id",
  formula: "t*(t>>5|t>>8)", // opcional si no referencia librería
  formulaId: "formula-id",   // opcional
  formulaName: "Bass",       // opcional para fórmulas inline
  start: 0,
  duration: 4
}
```

Formula:

```js
{
  id: "formula-id",
  name: "Bass",
  code: "t*(t>>5|t>>8)"
}
```
