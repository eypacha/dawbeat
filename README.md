# DawBeat

DAW experimental para componer formulas bytebeat sobre un timeline con reproduccion real en navegador.

La app ya no es una maqueta de clips de formula solamente. Hoy integra playback bytebeat, formula tracks, variable tracks, value tracker tracks, automation lanes, libreria, efectos, persistencia y export offline.

## Estado actual

Implementado hoy:

- pantalla inicial para desbloquear audio antes de entrar a la app
- reproduccion real con Web Audio + `public/vendors/ByteBeat.js`
- toolbar con `record`, `play`, `pause`, `stop`, `loop`, `new/open/save project`, `export WAV`, settings y cambio de `sampleRate`
- scrub del playhead desde ruler y desde el playhead
- zoom horizontal con `Ctrl/Cmd + wheel`
- auto-scroll del timeline durante playback
- timeline con:
  - tracks de formula
  - variable tracks
  - value tracker tracks
  - automation lanes
  - loop region editable
- resize vertical de formula tracks, variable tracks, value tracker tracks y automation lanes
- creacion de clips por drag sobre lanes vacios
- mover clips dentro del lane y entre tracks compatibles
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
- dialogo de binding para value trackers con `keyboard`, `variable`, `midiCc` y `midiNote`, incluido MIDI Learn
- grabacion de value tracker clips desde transport con preview en lane y auto-creacion opcional de track destino
- inicializacion de variables faltantes desde el editor de formulas
- conversion de inicializadores numericos a value tracker desde el editor de formulas
- panel opcional de expresion evaluada en tiempo real
- preview waveform opcional por clip
- formula effects: `Stereo Offset`, `T Replacement`
- visualizador de formula effects dentro del panel Formula, renderizado con `ByteBeat.js#getSamplesForTimeRange(...)`
- audio effects expuestos hoy: `EQ3`, `Distortion`, `Stereo Widener`, `Feedback Delay`, `Compressor`, `Limiter`, `Reverb` y `Master Gain`
- automation lanes para `masterGain` y parametros de audio effects
- visualizador del audio final dentro de la card `Master Gain`
- automation curves por segmento con opciones `Straight`, `Ease In`, `Ease Out` y `Ease In-Out` (`Ease In-Out` por defecto)
- persistencia automatica en `localStorage`
- import/export de proyecto JSON
- export WAV offline
- layout desktop completo, layout compacto con drawers laterales para Library/Effects y placeholder mobile actual

## Acotaciones importantes

- el timeline ya no es solo de clips de formula; `variableTracks` y `valueTrackerTracks` participan en la expresion activa
- los bindings de value tracker modelan `keyboard`, `variable`, `midiCc` y `midiNote`; hoy estan cableados el keyboard override por target seleccionado, la resolucion por binding `variable` y la entrada MIDI CC/Note via `midiInputService`
- el tipo de binding `keyboard` sigue dependiendo del target seleccionado; no enruta por binding dedicado como si lo hacen `midiCc` y `midiNote`
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
- `Drag` entre tracks compatibles: mueve el clip al lane destino
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
- `Context menu` en automation point: cambia la curva del segmento siguiente o elimina el punto
- `Context menu` en header de value tracker: rename, delete o edit binding
- `Click` en el boton de keyboard target de un value tracker: arma/desarma el track para keyboard override
- `Settings > MIDI input`: habilita/refresca Web MIDI y muestra mensajes recientes
- `Record`: inicia/finaliza grabacion de value tracker sobre el target activo; si no hay target, puede auto-crear uno
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
- durante recording, el input keyboard/MIDI puede capturarse a `valueTrackerRecordingSession` y consolidarse como clip al finalizar

## Formula editor, variables y value trackers

- `FormulaInputDialog` valida y resalta tokens de formula
- si una formula usa variables faltantes, el dialog puede inicializarlas
- un inicializador de texto crea un `variableTrack`
- un inicializador numerico puede convertirse a `valueTrackerTrack` con binding `variable`
- los value tracker clips editan una grilla hex por pasos con estados `SET`, `HOLD` y `EMPTY`
- `ValueTrackerBindingDialog` permite editar binding, elegir dispositivo/canal/controlador/nota y usar MIDI Learn
- `SettingsModal` expone enable/refresh de MIDI y debug de inputs/mensajes recientes
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
- curvas por segmento en automation points: `Straight`, `Ease In`, `Ease Out`, `Ease In-Out` (`Ease In-Out` por defecto)

El playback en vivo resuelve automatizacion por tiempo.
El export offline renderiza timeline, eval effects, master gain, audio effects compatibles y automatizacion offline del proyecto actual.

## Persistencia

- al iniciar, la app intenta cargar el proyecto guardado en `localStorage`
- si no existe uno guardado, parte de `src/data/demo.json`
- `projectPersistence` normaliza proyectos importados y serializa el estado persistible
- el proyecto actual serializa `version: 13`
- se persisten `tracks`, `variableTracks`, `valueTrackerTracks`, `formulas`, `audioEffects`, `evalEffects`, `automationLanes`, `masterGain`, `zoom`, `loopStart`, `loopEnd`, `loopEnabled`, `sampleRate`, `tickSize`, `showClipWaveforms` y `showEvaluatedPanel`, incluyendo `height` dentro de tracks y lanes
- desde la toolbar se puede crear proyecto vacio, abrir JSON, guardar JSON y exportar WAV
- desde Settings se puede resetear el storage local, togglear waveform/evaluated panel e inspeccionar MIDI

## Estructura actual

```text
src/
  components/
    boot/
      StartScreen.vue
    effects/
      AudioOutputVisualizer.vue
      AudioBitCrusherItem.vue
      AudioCompressorItem.vue
      AudioDelayItem.vue
      AudioDistortionItem.vue
      AudioEqItem.vue
      FormulaEffectsVisualizer.vue
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
      AutomationCurveMenu.vue
      Playhead.vue
      Timeline.vue
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
      SideDrawer.vue
      TextInputDialog.vue
      Toolbar.vue
      TrackPresentationDialog.vue
      ValueTrackerBindingDialog.vue
      ValueTrackerClipEditorDialog.vue
  composables/
    useContextMenu.js
    usePointerEdgeAutoScroll.js
    useTimelineClipInteraction.js
    useTimelineLaneResize.js
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
    midiInputService.js
    notifications.js
    projectPersistence.js
    snapService.js
    timelineLaneLayoutService.js
    timelineService.js
    trackPlaybackState.js
    trackUnionOperatorService.js
    valueTrackerInputService.js
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
- `timelineLaneLayoutService` normaliza alturas persistibles por lane
- `valueTrackerInputService` y `midiInputService` centralizan el ingreso de keyboard/MIDI hacia el store
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
  height: 80,
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
  height: 44,
  clips: []
}
```

Variable clip:

```js
{
  id: "clip-id",
  formula: "0",
  start: 0,
  duration: 4
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
  height: 64,
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
  effectId: "audio-effect-id",   // solo para audioEffectParam
  effectType: "delay",           // solo para audioEffectParam
  paramKey: "wet",               // solo para audioEffectParam
  height: 52,
  points: [{ time: 0, value: 1 }]
}
```
