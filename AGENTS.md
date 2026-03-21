# AGENTS.md

Este documento define como debe trabajar un agente dentro de este repositorio.

El objetivo es mantener el desarrollo:

- modular
- mantenible
- predecible
- facil de extender

## Estado real del proyecto

El proyecto ya no es una maqueta simple de timeline.

Hoy existen:

- pantalla inicial para desbloquear audio antes de entrar a la app
- reproduccion bytebeat real en navegador con Web Audio + vendor `ByteBeat.js`
- toolbar con `record`, `play`, `pause`, `stop`, `loop`, `new/open/save project`, `export WAV`, cambio de `sampleRate` y settings
- scrub del playhead desde ruler y desde el playhead
- zoom horizontal con `Ctrl/Cmd + wheel`
- auto-scroll del timeline durante playback
- timeline con cuatro tipos de lane:
  - tracks de formula
  - variable tracks
  - value tracker tracks
  - automation lanes
- loop region editable
- resize vertical de formula tracks, variable tracks, value tracker tracks y automation lanes
- creacion de clips por drag en lanes vacios
- mover clips dentro del lane y entre tracks compatibles
- resize de inicio y fin
- duplicado con `Alt/Option + drag`
- bypass temporal de snap con `Shift + drag`
- seleccion multiple por marquee con `Shift + drag` en el timeline
- mover y duplicar grupos de clips seleccionados
- copy/paste al playhead
- nudge con flechas izquierda/derecha
- undo/redo con historial en store
- reorder y duplicado de tracks
- rename, color, mute, solo, `unionOperator` y borrado de tracks
- libreria de formulas funcional con alta, seleccion, edicion, borrado y drag and drop
- clips con formula inline o referencia a `formulaId`
- edicion de formulas por `FormulaInputDialog` para clips, formulas de libreria y variable clips
- editor hex para value tracker clips mediante `ValueTrackerClipEditorDialog`
- dialogo de binding para value trackers mediante `ValueTrackerBindingDialog`, con `keyboard`, `variable`, `midiCc`, `midiNote` y MIDI Learn
- grabacion de value tracker clips desde transport, con preview en lane y auto-creacion opcional de track destino
- preview waveform opcional por clip
- panel opcional de formula evaluada
- eval effects: `Stereo Offset`, `T Replacement`
- audio effects expuestos hoy: `EQ3`, `Distortion`, `Stereo Widener`, `Feedback Delay`, `Compressor`, `Limiter`, `Reverb` y `Master Gain`
- automation lanes para `masterGain` y para parametros de audio effects
- persistencia automatica en `localStorage`
- import/export de proyecto JSON
- export WAV offline con render de timeline, eval effects, master gain, audio effects compatibles y automatizacion offline
- keyboard override para value trackers con `0-9` y `A-F`
- layout desktop completo, layout compacto con `SideDrawer` para Library/Effects y placeholder mobile actual

## Que no asumir

No asumir que el timeline solo maneja tracks de formula.
Hoy tambien existen:

- `variableTracks`
- `valueTrackerTracks`
- `automationLanes`

No asumir que toda la edicion ocurre inline en `TimelineClip.vue`.
Hoy existen dialogs y flujos separados para:

- formulas de clip y formulas de libreria via `FormulaInputDialog`
- value tracker clips via `ValueTrackerClipEditorDialog`
- nombre/color de track
- rename de value tracker track

No asumir que clip y formula son siempre la misma entidad.
Hoy un clip de formula puede:

- guardar `formula` inline
- referenciar una formula compartida con `formulaId`

No asumir que todas las entidades modeladas tengan un entrypoint UI dedicado y visible.
`variableTracks` y `valueTrackerTracks` pueden aparecer por:

- proyecto cargado
- normalizacion de proyecto
- inicializacion desde `FormulaInputDialog`

Verificar siempre el entrypoint real antes de documentar o modificar un flujo.

No asumir que el soporte de bindings implica integracion completa de hardware.
Hoy `valueTrackerService` modela:

- `keyboard`
- `variable`
- `midiCc`
- `midiNote`

pero la integracion efectiva hoy cubre:

- keyboard override
- resolucion por binding `variable`
- input MIDI CC / MIDI Note via `midiInputService` + `ValueTrackerBindingDialog`

No asumir que el tipo `keyboard` enruta input por binding dedicado.
Hoy sigue dependiendo del target seleccionado en UI.

No asumir que desktop, compact layout y mobile comparten la misma composicion visible.
Hoy la app usa:

- layout desktop con Library + Timeline + Effects
- layout compacto con `SideDrawer` para Library y Effects
- placeholder mobile actual en lugar de la app completa

No asumir que un componente existente implica feature activa.
Ejemplo concreto:

- `AudioBitCrusherItem.vue` existe en el arbol
- los audio effects realmente expuestos hoy son los conectados en `EffectsPanel.vue` + `audioEffectService.js`

No asumir paridad automatica entre playback en vivo y export offline.
Hoy ambos caminos soportan audio effects y automatizacion, pero viven en implementaciones separadas:

- `bytebeatService` para vivo
- `exportService` para offline

Si una tarea toca audio, automatizacion o export, verificar ambos caminos por separado.

No asumir que todos los cambios persistidos pertenecen solo al dominio musical.
Hoy tambien se persisten flags de UI como:

- `showClipWaveforms`
- `showEvaluatedPanel`

## Objetivo actual

La prioridad es consolidar un flujo de composicion que combine:

- formula tracks
- variable tracks
- value tracker tracks
- automation lanes
- playback bytebeat
- persistencia
- historial y utilidades de edicion

sin degradar edicion, reproduccion, export ni restauracion de proyecto.

El sistema debe seguir permitiendo:

- crear y editar clips de formula
- asignar y desasignar formulas de libreria a clips
- mover clips dentro del track y entre tracks
- duplicar clips y grupos con modificadores
- editar formulas de variable clips
- editar value tracker clips por pasos
- crear o inicializar variables faltantes desde el editor de formula
- convertir inicializadores numericos a value tracker desde el editor de formula
- reproducir el timeline
- mover el playhead manualmente
- combinar tracks audibles con `unionOperator`
- resolver variables activas segun el tiempo
- aplicar live input de value tracker sin romper playback
- grabar takes de value tracker desde keyboard/MIDI sin romper playback ni historial
- editar bindings de value tracker y aprender MIDI sin romper el flujo de composicion
- automatizar `masterGain` y parametros de audio effects
- guardar, abrir y exportar proyectos

## Principios de desarrollo

### DRY

No duplicar logica.

Si algo se reutiliza, moverlo a:

- `utils`
- `services`
- `composables`
- `stores`

Nunca copiar y pegar logica entre timeline, library, automation, value tracker, effects, settings, export o persistence.

### Modularidad

Preferir modulos pequenos y explicitos.

Si un archivo supera aproximadamente 200-300 lineas, considerar dividirlo.

Especial cuidado con:

- `Timeline.vue`
- `TimelineTrack.vue`
- `TimelineClip.vue`
- `TimelineVariableTrack.vue`
- `TimelineValueTrackerTrack.vue`
- `TimelineAutomationLane.vue`
- `FormulaLibrary.vue`
- `EffectsPanel.vue`
- `dawStore.js`
- `useTransportPlayback.js`

porque concentran interaccion y pueden crecer mal.

### Componentes pequenos

Cada componente Vue debe tener una responsabilidad clara.

La UI debe seguir componiendose con subcomponentes en lugar de concentrar timeline, library, transport, effects o dialogs en un solo archivo.

## Stack

Frontend:

- Vue 3
- Vite
- Tailwind CSS 4

Estado global:

- Pinia

Audio:

- Web Audio API
- Tone.js para parte del render/export offline
- vendor `ByteBeat.js`

UI / iconografia:

- `lucide-vue-next`

No introducir dependencias pesadas sin justificacion.

## Dependencias prohibidas

No usar:

- Monaco Editor
- librerias de timeline pesadas
- frameworks UI completos

La UI debe seguir siendo liviana y controlada por el proyecto.

## Arquitectura actual

Arquitectura vigente:

```text
UI
↓
Store
↓
Services / Composables
↓
Engine
↓
Bytebeat Service / Export / Persistence
↓
Web Audio / Tone Offline / File APIs / localStorage
```

Regla practica:

- la UI no debe contener logica compleja de timeline, formulas, variables, value trackers, automation, history o efectos si puede vivir en `services` o `composables`
- el store centraliza estado, acciones, clipboard, seleccion e historial
- `timelineEngine` decide la expresion activa y combina tracks audibles
- `variableTrackService` resuelve variables formulaicas y variables provenientes de value trackers
- `valueTrackerService` resuelve steps, holds, eventos y live input
- `valueTrackerInputService` y `midiInputService` centralizan el ingreso de keyboard/MIDI hacia el store
- `automationService` resuelve lanes de `masterGain` y parametros de audio effects
- `formulaService` resuelve formulas inline o referenciadas
- `formulaWaveformService` renderiza previews de waveform
- `timelineLaneLayoutService` normaliza alturas persistibles por lane
- `bytebeatService` maneja integracion de audio en vivo
- `projectPersistence` normaliza, serializa y restaura proyectos

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

El agente debe respetar esta estructura y extenderla sin mezclar responsabilidades.

## Store central

El estado global principal vive en `dawStore`.

Campos relevantes hoy:

```js
{
  audioReady: false,
  playing: false,
  time: 0,
  zoom: 1,
  sampleRate: 8000,
  tickSize: 1024,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 16,
  tracks: [],
  variableTracks: [],
  valueTrackerTracks: [],
  formulas: [],
  audioEffects: [],
  evalEffects: [],
  automationLanes: [],
  masterGain: 1,
  showEvaluatedPanel: true,
  showClipWaveforms: true,
  selectedClipIds: [],
  selectedClipId: null,
  selectedTrackId: null,
  selectedFormulaId: null,
  selectedValueTrackerTrackId: null,
  selectedAutomationPoint: null,
  editingClipId: null,
  editingFormulaId: null,
  clipDragPreview: null,
  clipClipboard: null,
  valueTrackerRecordingSession: null,
  valueTrackerLiveInputs: {},
  historyPast: [],
  historyFuture: [],
  historyTransaction: null
}
```

Cada track de formula debe modelarse asi:

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

Cada clip de formula debe modelarse asi:

```js
{
  id: "clip-id",
  formula: "t*(t>>5|t>>8)", // opcional
  formulaId: "formula-id",  // opcional
  formulaName: "Bass",      // opcional
  start: 0,
  duration: 4
}
```

Cada variable track debe modelarse asi:

```js
{
  name: "a",
  height: 44,
  clips: []
}
```

Cada clip de variable debe modelarse asi:

```js
{
  id: "clip-id",
  formula: "0",
  start: 0,
  duration: 4
}
```

Cada value tracker track debe modelarse asi:

```js
{
  id: "value-track-id",
  name: "Value Tracker 1",
  binding: {
    type: null, // o "variable", "keyboard", "midiCc", "midiNote"
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

Cada clip de value tracker debe modelarse asi:

```js
{
  id: "clip-id",
  start: 0,
  duration: 4,
  stepSubdivision: 4,
  values: [64, null, null, 96]
}
```

Cada formula de libreria debe modelarse asi:

```js
{
  id: "formula-id",
  name: "Bass",
  code: "t*(t>>5|t>>8)"
}
```

Cada automation lane debe modelarse asi:

```js
{
  id: "masterGain" || "audioEffect:<effectId>:<paramKey>",
  type: "masterGain" || "audioEffectParam",
  effectId: "audio-effect-id",   // solo para audioEffectParam
  effectType: "delay",           // solo para audioEffectParam
  paramKey: "wet",               // solo para audioEffectParam
  height: 52,
  points: [
    { time: 0, value: 1 }
  ]
}
```

## Timeline

El timeline es el nucleo de la app.

Debe seguir soportando:

- grilla temporal
- formula tracks
- variable tracks
- value tracker tracks
- automation lanes
- seleccion simple y multiple de clips
- marquee selection
- drag dentro del track
- drag entre tracks de formula
- resize de inicio y fin
- resize vertical de lanes
- preview de drag
- creacion de clips por drag
- drop de formulas desde library
- loop region editable
- playhead y scrub
- zoom horizontal
- reorder de tracks
- puntos de automatizacion

### Interacciones que ya existen y no deben romperse

- drag normal con snap activo
- `Shift + drag` para bypass temporal de snap
- `Alt/Option + drag` para duplicar al soltar
- `Shift + drag` sobre area vacia para marquee selection
- drag de formula desde library a lane para crear clip
- drag de formula desde library a clip para reasignar referencia
- double click en clip de formula para editar formula
- double click en variable clip para editar formula de variable
- double click en value tracker clip para abrir el editor hex
- click en automation lane para crear punto
- drag de automation point para moverlo
- `Delete` / `Backspace` sobre automation point seleccionado para borrarlo
- mute por track
- solo por track
- copy/paste de clips
- nudge con flechas
- undo/redo
- `Space` para play/pause
- `L` para loop
- `Ctrl/Cmd + wheel` para zoom
- `0-9` y `A-F` para keyboard override del value tracker activo

Si se modifica una interaccion del timeline, de formulas o de automatizacion, verificar siempre estos casos.

## Playback

El playback actual usa bytebeat real.

Reglas:

- no eliminar ni degradar la integracion con `bytebeatService`
- cualquier cambio en clips, tracks, formulas, variables, value trackers, `unionOperator`, mute o solo debe mantener consistente la expresion activa
- `timelineEngine.getActiveFormula` debe ignorar tracks no audibles
- `timelineEngine.getActiveFormula` debe prependear definiciones activas provenientes de `variableTracks` y `valueTrackerTracks`
- `formulaService` debe seguir resolviendo correctamente formulas inline y referenciadas
- los eval effects deben seguir aplicandose antes de enviar expresiones al playback
- el panel evaluado debe seguir reflejando la expresion efectiva despues de eval effects
- `valueTrackerLiveInputs` puede sobreescribir temporalmente el valor de un value tracker durante playback o scrub

## Formulas, variables y value trackers

Estado actual:

- `FormulaLibrary.vue` es parte real del flujo
- existe seleccion de formula de libreria
- existe alta, edicion y borrado de formulas
- los clips de formula pueden vincularse a una formula compartida o separarse de ella
- los variable clips guardan formula inline y no usan `formulaId`
- los value tracker clips guardan steps/values discretos
- el double click sobre clip abre el editor correcto segun el `laneType`
- existe edicion de binding por `ValueTrackerBindingDialog`
- `SettingsModal` expone enable/refresh de MIDI y mensajes recientes
- existe grabacion de value trackers desde transport con `valueTrackerRecordingSession`
- `FormulaInputDialog` puede detectar variables faltantes
- `FormulaInputDialog` puede inicializar variables faltantes como variable tracks
- `FormulaInputDialog` puede convertir inicializadores numericos a value trackers con binding `variable`
- un clip inline puede promoverse a libreria con `addClipFormulaToLibrary`

Si se modifica este flujo:

- no duplicar la logica de resolucion entre clip y libreria
- usar `formulaService`, `variableTrackService` y `valueTrackerService` donde corresponda
- preservar los flujos `assignFormulaToClip`, `detachClipFormula`, `addClipFormulaToLibrary`, `ensureInitializedVariableTracks`, `ensureInitializedValueTrackerTracks`, `updateValueTrackerTrackBinding`, `startValueTrackerRecording` y `finishValueTrackerRecording`

## Efectos y automatizacion

Hoy existen dos categorias de effects:

- eval effects: transforman la expresion bytebeat antes de reproducir/renderizar
- audio effects: transforman la senal de audio en vivo y offline cuando el efecto esta soportado

Actualmente estan implementados y expuestos:

- eval: `Stereo Offset`, `T Replacement`
- audio: `EQ3`, `Distortion`, `Stereo Widener`, `Feedback Delay`, `Compressor`, `Limiter`, `Reverb`
- ganancia master: `Master Gain`

Automatizacion actual:

- lane de `masterGain`
- lanes por parametro de audio effects

Si una tarea toca effects o automation:

- no mezclar effects de formula con effects de audio
- validar impacto en reproduccion en vivo
- validar impacto en export offline por separado
- no romper reorder, enable/disable ni expand/collapse de effects
- no romper creacion, edicion y borrado de automation lanes y points

## Persistencia y export

Hoy existe:

- guardado automatico en `localStorage`
- import de proyecto JSON
- export de proyecto JSON
- reset de storage local
- export WAV offline
- normalizacion de proyectos con `version: 12`
- persistencia de `tracks`, `variableTracks`, `valueTrackerTracks`, `formulas`
- persistencia de `audioEffects`, `evalEffects`, `automationLanes`, `masterGain`
- persistencia de `zoom`, `loopStart`, `loopEnd`, `loopEnabled`, `sampleRate` y `tickSize`
- persistencia de `height` dentro de tracks y automation lanes
- persistencia de `showClipWaveforms` y `showEvaluatedPanel`

Si se cambia el shape del proyecto:

- actualizar `projectPersistence`
- preservar compatibilidad de normalizacion cuando sea razonable
- revisar `demo.json`

## Responsabilidades del agente

Cuando el agente implemente una funcionalidad:

1. evaluar si requiere nuevos modulos
2. evitar duplicacion de logica
3. dividir componentes complejos
4. mantener la arquitectura clara
5. verificar impacto en playback, formulas, variables, value trackers, automation, persistencia, export e historial

## Que NO hacer

El agente no debe:

- crear archivos monoliticos
- duplicar logica de drag, resize, seleccion, clipboard, automatizacion o resolucion de formulas
- introducir dependencias innecesarias
- mezclar UI con logica compleja de timeline, audio, history, automation o persistencia
- romper playback bytebeat actual
- documentar features como implementadas si siguen parciales o no estan cableadas
- asumir que export offline y playback en vivo son el mismo camino interno

## Prioridades actuales

Orden recomendado:

1. consolidar timeline y transport existentes
2. consolidar formulas compartidas, variables y value trackers
3. consolidar automatizacion de audio effects y master gain
4. mantener integridad de playback y export offline
5. mantener estable persistencia, import/export, historial y efectos

## Objetivo de esta etapa

Construir una base solida para componer formulas y modulaciones en el tiempo, manteniendo alineadas:

- interaccion de timeline
- estado global
- libreria de formulas
- variable tracks
- value tracker tracks
- automation lanes
- playback bytebeat
- persistencia de proyecto
- historial, clipboard y utilidades de edicion

Las proximas iteraciones deben apoyarse en esta estructura, no reemplazarla sin necesidad.
