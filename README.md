# DawBeat

DAW experimental para componer formulas bytebeat sobre un timeline con reproduccion real en navegador.

La app ya no es una maqueta de clips de formula solamente. Hoy integra playback bytebeat, formula tracks, variable tracks, value tracker tracks, automation lanes, libreria, efectos, persistencia y export offline.

## Estado actual

Implementado hoy:

- pantalla inicial para desbloquear audio antes de entrar a la app
- reproduccion real con Web Audio + `public/vendors/ByteBeat.js`
- toolbar con `play`, `pause`, `stop`, `loop`, `new/open/save project`, `export WAV`, settings y cambio de `sampleRate`
- scrub del playhead desde ruler y desde el playhead
- zoom horizontal con `Ctrl/Cmd + wheel`
- auto-scroll del timeline durante playback
- timeline con:
  - tracks de formula
  - variable tracks
  - value tracker tracks
  - automation lanes
  - loop region editable
- creacion de clips por drag sobre lanes vacios
- mover clips dentro del lane y entre tracks de formula
- resize de inicio y fin de clip
- duplicado con `Alt/Option + drag`
- bypass temporal de snap con `Shift + drag`
- seleccion multiple por marquee con `Shift + drag`
- mover y duplicar grupos de clips seleccionados
- copy/paste de clips al playhead
- nudge de clips seleccionados con flechas izquierda/derecha
- undo/redo con historial en store
- reorder y duplicado de tracks
- rename, color, mute, solo y borrado de tracks
- operador de union por track (`|`, `+`, `-`, `*`, `<<`, `>>`, `&`, `^`, `%`)
- libreria de formulas funcional con alta, seleccion, edicion, borrado y drag and drop
- clips con formula inline o referencia a `formulaId`
- edicion de formulas por dialogo para clips, formulas de libreria y variable clips
- editor hex para value tracker clips
- inicializacion de variables faltantes desde el editor de formulas
- conversion de inicializadores numericos a value tracker desde el editor de formulas
- panel opcional de expresion evaluada en tiempo real
- preview waveform opcional por clip
- formula effects: `Stereo Offset`, `T Replacement`
- audio effects expuestos hoy: `EQ3`, `Distortion`, `Stereo Widener`, `Feedback Delay`, `Compressor`, `Limiter`, `Reverb` y `Master Gain`
- automation lanes para `masterGain` y parametros de audio effects
- persistencia automatica en `localStorage`
- import/export de proyecto JSON
- export WAV offline

## Acotaciones importantes

- el timeline ya no es solo de clips de formula; `variableTracks` y `valueTrackerTracks` participan en la expresion activa
- los bindings de value tracker modelan `keyboard`, `variable`, `midiCc` y `midiNote`, pero la entrada en vivo cableada hoy es keyboard override y resolucion por binding `variable`
- playback en vivo y export offline soportan audio effects y automatizacion, pero siguen siendo caminos internos separados; si tocas audio o export, hay que verificar ambos
- el repo contiene algunos archivos que no necesariamente representan features expuestas en la UI actual; para el estado real, tomar como fuente `EffectsPanel.vue`, `dawStore.js` y `projectPersistence.js`

## Stack

- Vue 3
- Vite
- Tailwind CSS 4
- Pinia
- Web Audio API
- Tone.js para parte del render offline
- `public/vendors/ByteBeat.js`
- `lucide-vue-next`

## Como correrlo

```bash
pnpm install
pnpm dev
```

Build de produccion:

```bash
pnpm build
```

Preview local:

```bash
pnpm preview
```

## Interacciones actuales

- `Click` sobre formula clip: selecciona clip
- `Double click` sobre formula clip: abre edicion de formula del clip
- `Double click` sobre variable clip: abre edicion de formula de variable
- `Double click` sobre value tracker clip: abre el editor hex del clip
- `Drag` sobre formula clip: mueve con snap activo
- `Shift + drag` sobre clip: mueve sin snap
- `Alt/Option + drag` sobre clip: duplica al soltar
- `Drag` entre tracks de formula: mueve el clip al track destino
- `Drag` sobre handles laterales: resize
- `Shift + drag` durante resize: resize sin snap
- `Shift + drag` sobre un area vacia del timeline: seleccion multiple por marquee
- `Drag` en espacio vacio de un lane: crea clip del tipo de ese lane
- `Drag` de una formula desde Library al lane: crea clip referenciando esa formula
- `Drag` de una formula desde Library a un clip: reasigna la formula del clip
- `Drag` del header del track: reordena tracks
- `Click` en Library: selecciona formula
- `Double click` en Library: abre edicion de formula de libreria
- `Click` en automation lane: crea automation point
- `Drag` de automation point: mueve el punto
- `Click` en el boton de keyboard target de un value tracker: arma/desarma el track para keyboard override
- `0-9` y `A-F`: envian live input al value tracker activo para keyboard override
- `Space`: play/pause
- `L`: toggle loop
- `Cmd/Ctrl + C`: copia clips seleccionados
- `Cmd/Ctrl + V`: pega clips en el playhead
- `Cmd/Ctrl + Z`: undo
- `Cmd/Ctrl + Shift + Z` o `Ctrl + Y`: redo
- `ArrowLeft` / `ArrowRight`: nudge de clips seleccionados
- `Delete` o `Backspace`: borra clip(s) seleccionados o automation point seleccionado
- `Esc`: limpia seleccion cuando no hay un editor abierto

## Reglas de playback

- el snap a grid esta activo por defecto
- `Shift` desactiva el snap solo durante el gesto actual
- `Alt/Option` confirma la duplicacion en `pointerup`
- los tracks muteados no participan en la expresion activa
- si existe al menos un track en solo, solo los tracks `soloed` participan en la expresion activa
- `timelineEngine` combina los clips activos audibles usando el `unionOperator` de cada track
- despues prependea definiciones activas provenientes de `variableTracks` y `valueTrackerTracks`
- `formulaService` resuelve clips inline y clips referenciados antes de aplicar eval effects
- el panel evaluado muestra la expresion efectiva que llega al playback tras aplicar eval effects
- `valueTrackerLiveInputs` permite live override de value trackers durante playback o scrub

## Formula editor, variables y value trackers

- `FormulaInputDialog` valida y resalta tokens de formula
- si una formula usa variables faltantes, el dialog puede inicializarlas
- un inicializador de texto crea un `variableTrack`
- un inicializador numerico puede convertirse a `valueTrackerTrack` con binding `variable`
- los value tracker clips editan una grilla hex por pasos con estados `SET`, `HOLD` y `EMPTY`
- el panel evaluado y el playback usan el resultado combinado de tracks, variables y value trackers segun el tiempo actual

## Efectos y automatizacion

Eval effects actuales:

- `Stereo Offset`
- `T Replacement`

Audio effects actuales expuestos:

- `EQ3`
- `Distortion`
- `Stereo Widener`
- `Feedback Delay`
- `Compressor`
- `Limiter`
- `Reverb`
- `Master Gain`

Automatizacion actual:

- lane de `masterGain`
- lanes por parametro de audio effect

El playback en vivo resuelve automatizacion por tiempo.
El export offline renderiza timeline, eval effects, master gain, audio effects compatibles y automatizacion offline del proyecto actual.

## Persistencia

- al iniciar, la app intenta cargar el proyecto guardado en `localStorage`
- si no existe uno guardado, parte de `src/data/demo.json`
- `projectPersistence` normaliza proyectos importados y serializa el estado persistible
- el proyecto actual serializa `version: 12`
- se persisten `tracks`, `variableTracks`, `valueTrackerTracks`, `formulas`, `audioEffects`, `evalEffects`, `automationLanes`, `masterGain`, `zoom`, `loop`, `sampleRate`, `tickSize`, `showClipWaveforms` y `showEvaluatedPanel`
- desde la toolbar se puede crear proyecto vacio, abrir JSON, guardar JSON y exportar WAV
- desde Settings se puede resetear el storage local y togglear waveform/evaluated panel

## Estructura actual

```text
src/
  components/
    boot/
      StartScreen.vue
    effects/
      AudioBitCrusherItem.vue
      AudioCompressorItem.vue
      AudioDelayItem.vue
      AudioDistortionItem.vue
      AudioEqItem.vue
      AudioLimiterItem.vue
      AudioMasterGainItem.vue
      AudioReverbItem.vue
      AudioStereoWidenerItem.vue
      EffectItem.vue
      EffectsPanel.vue
      EvalEffectItem.vue
      EffectParamAutomationButton.vue
    evaluated/
      EvaluatedPanel.vue
    library/
      FormulaLibrary.vue
    timeline/
      Playhead.vue
      Timeline.vue
      TimelineAddTrackRow.vue
      TimelineAutomationLane.vue
      TimelineClip.vue
      TimelineClipPreview.vue
      TimelineClipWaveform.vue
      TimelineLoopRegion.vue
      TimelineTrack.vue
      TimelineValueTrackerClip.vue
      TimelineValueTrackerTrack.vue
      TimelineVariableClip.vue
      TimelineVariableTrack.vue
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
      ValueTrackerClipEditorDialog.vue
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
    automationService.js
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
    valueTrackerService.js
    variableTrackService.js
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
Web Audio / Tone Offline / File APIs / localStorage
```

Notas practicas:

- `timelineEngine` decide la expresion activa segun tiempo, tracks audibles, variables activas y value trackers activos
- `formulaService` resuelve nombre y codigo tanto para clips inline como referenciados
- `variableTrackService` y `valueTrackerService` participan en la resolucion de definiciones prependidas a la formula activa
- `automationService` resuelve `masterGain` y parametros de audio effects por tiempo
- `bytebeatService` controla audio en vivo, sample rate, master gain y cadena de audio en tiempo real
- `exportService` usa un camino offline separado con Tone.js para renderizar el WAV
- `projectPersistence` normaliza, versiona y serializa proyectos

## Modelos principales

Track de formula:

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

Clip de formula:

```js
{
  id: "clip-id",
  formula: "t*(t>>5|t>>8)", // opcional si no referencia libreria
  formulaId: "formula-id",  // opcional
  formulaName: "Bass",      // opcional
  start: 0,
  duration: 4
}
```

Variable track:

```js
{
  name: "a",
  clips: []
}
```

Value tracker track:

```js
{
  id: "value-track-id",
  name: "Value Tracker 1",
  binding: {
    type: null,
    deviceId: null,
    channel: null,
    controller: null,
    note: null,
    variableName: null
  },
  clips: []
}
```

Value tracker clip:

```js
{
  id: "clip-id",
  start: 0,
  duration: 4,
  stepSubdivision: 4,
  values: [64, null, null, 96]
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

Automation lane:

```js
{
  id: "masterGain" || "audioEffect:<effectId>:<paramKey>",
  type: "masterGain" || "audioEffectParam",
  points: [{ time: 0, value: 1 }]
}
```
