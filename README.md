# DawBeat

DAW experimental para componer fórmulas bytebeat sobre un timeline con reproducción real en navegador.

La app ya no es una maqueta. Hoy integra timeline editable, playback bytebeat, librería de fórmulas, efectos, persistencia, export y utilidades de edición orientadas a componer.

## Estado actual

Implementado hoy:

- reproducción real con Web Audio + `public/vendors/ByteBeat.js`
- toolbar con `play`, `pause`, `stop`, `loop`, `new/open/save project` y `export WAV`
- scrub del playhead desde ruler y playhead
- zoom horizontal con `Ctrl/Cmd + wheel`
- timeline con tracks, clips, loop region editable y auto-scroll durante playback
- creación de clips por drag sobre un lane vacío
- mover clips dentro del track y entre tracks
- resize de inicio y fin de clip
- duplicado con `Alt/Option + drag`
- bypass temporal de snap con `Shift + drag`
- selección múltiple de clips por marquee con `Shift + drag` en el timeline
- mover y duplicar grupos de clips seleccionados
- copy/paste de clips al playhead
- nudge de clips seleccionados con flechas izquierda/derecha
- undo/redo con historial en store
- reorder y duplicado de tracks
- rename, color, mute, solo y borrado de tracks
- operador de unión por track (`|`, `+`, `-`, `*`, `<<`, `>>`, `&`, `^`, `%`)
- librería de fórmulas real con alta, edición, selección y borrado
- drag de fórmulas desde la librería al timeline o a clips existentes
- clips con fórmula inline o referencia a `formulaId`
- edición de fórmulas por diálogo tanto para clips como para librería
- preview waveform por clip opcional
- panel opcional de expresión evaluada en tiempo real
- efectos de fórmula: `Stereo Offset`, `T Replacement`
- efectos de audio: `Delay`, `EQ`, `BitCrusher` y `Master Gain`
- persistencia automática en `localStorage`
- import/export de proyecto JSON
- export WAV offline

Todavía acotado o no equivalente:

- el export WAV no replica la cadena completa de efectos de audio en vivo
- no toda mejora visual del playback implica una mejora equivalente en export
- faltan más presets, más efectos y automatizaciones de mayor nivel

## Stack

- Vue 3
- Vite
- Tailwind CSS 4
- Pinia
- Web Audio API
- `public/vendors/ByteBeat.js`
- `lucide-vue-next`

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
- `Shift + drag` sobre un área vacía del timeline: selección múltiple por marquee
- `Drag` en espacio vacío del track: crea clip
- `Drag` de una fórmula desde Library al lane: crea clip referenciando esa fórmula
- `Drag` de una fórmula desde Library a un clip: reasigna la fórmula del clip
- `Drag` del header del track: reordena tracks
- `Click` en Library: selecciona fórmula
- `Double click` en Library: abre edición de fórmula de librería
- `Space`: play/pause
- `L`: toggle loop
- `Cmd/Ctrl + C`: copia clips seleccionados
- `Cmd/Ctrl + V`: pega clips en el playhead
- `Cmd/Ctrl + Z`: undo
- `Cmd/Ctrl + Shift + Z` o `Ctrl + Y`: redo
- `ArrowLeft` / `ArrowRight`: nudge de clips seleccionados
- `Delete` o `Backspace`: borra clip o selección actual

## Reglas de playback

- el snap a grid está activo por defecto
- `Shift` desactiva el snap sólo durante el gesto actual
- `Alt/Option` confirma la duplicación en `pointerup`
- los tracks muteados no participan en la fórmula activa
- si existe al menos un track en solo, sólo los tracks `soloed` participan en la fórmula activa
- `timelineEngine` combina los clips activos audibles usando el `unionOperator` de cada track
- `formulaService` resuelve clips inline y clips referenciados antes de evaluar efectos
- el panel evaluado muestra la expresión efectiva que llega al playback tras aplicar eval effects
- el export WAV hoy renderiza timeline + eval effects + `masterGain`; no replica la cadena completa de efectos de audio en vivo

## Persistencia

- al iniciar, la app intenta cargar el proyecto guardado en `localStorage`
- si no existe uno guardado, parte de `src/data/demo.json`
- `projectPersistence` normaliza proyectos importados y serializa el estado persistible
- el proyecto actual serializa `version: 5`
- se persisten tracks, clips, fórmulas, zoom, loop, sample rate, effects, `masterGain`, `showClipWaveforms` y `showEvaluatedPanel`
- desde la toolbar se puede crear proyecto vacío, abrir JSON, guardar JSON y exportar WAV
- desde Settings se puede resetear el storage local y togglear waveform/evaluated panel

## Estructura actual

```text
src/
  components/
    boot/
      StartScreen.vue
    effects/
      AudioBitCrusherItem.vue
      AudioDelayItem.vue
      AudioEqItem.vue
      AudioMasterGainItem.vue
      EffectItem.vue
      EffectsPanel.vue
      EvalEffectItem.vue
    evaluated/
      EvaluatedPanel.vue
    library/
      FormulaLibrary.vue
    timeline/
      Playhead.vue
      Timeline.vue
      TimelineAddTrackRow.vue
      TimelineClip.vue
      TimelineClipPreview.vue
      TimelineClipWaveform.vue
      TimelineLoopRegion.vue
      TimelineTrack.vue
      TrackColorPalette.vue
      TrackUnionOperatorMenu.vue
    transport/
      Toolbar.vue
    ui/
      Button.vue
      CollapseTransition.vue
      ConfirmDialog.vue
      ContextMenu.vue
      Divider.vue
      Dropdown.vue
      FormulaInputDialog.vue
      IconButton.vue
      Input.vue
      Modal.vue
      Panel.vue
      SettingsModal.vue
      SnackbarContainer.vue
      SnackbarItem.vue
      TextInputDialog.vue
      Toolbar.vue
      TrackPresentationDialog.vue
  composables/
    useContextMenu.js
    usePointerEdgeAutoScroll.js
    useTimelineClipInteraction.js
    useTimelineMarqueeSelection.js
    useTransportPlayback.js
  engine/
    timelineEngine.js
  services/
    audioEffectService.js
    bytebeatNodeLoader.js
    bytebeatService.js
    dawStoreService.js
    evalEffectService.js
    exportService.js
    formulaService.js
    formulaWaveformService.js
    keyboardShortcuts.js
    notifications.js
    projectPersistence.js
    snapService.js
    timelineService.js
    trackPlaybackState.js
    trackUnionOperatorService.js
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

Notas prácticas:

- `timelineEngine` decide la fórmula activa según tiempo, tracks audibles y fórmulas resueltas
- `formulaService` resuelve nombre y código tanto para clips inline como referenciados
- `bytebeatService` controla audio en vivo, sample rate, master gain y cadena de efectos de audio
- `formulaWaveformService` renderiza previews de waveform para clips
- `projectPersistence` normaliza, versiona y serializa proyectos

## Modelos principales

Track:

```js
{
  id: "track-id",
  color: "#6366f1",
  muted: false,
  soloed: false,
  unionOperator: "|",
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
