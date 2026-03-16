# AGENTS.md

Este documento define cómo debe trabajar un agente dentro de este repositorio.

El objetivo es mantener el desarrollo:

- modular
- mantenible
- predecible
- fácil de extender

## Estado real del proyecto

El proyecto ya tiene una base funcional y varias áreas productivas.

Hoy existen:

- reproducción bytebeat real en navegador
- toolbar con `play`, `pause`, `stop`, `loop`, `new/open/save project` y `export WAV`
- scrub del playhead
- zoom horizontal del timeline
- timeline con tracks, clips y loop region editable
- creación, movimiento, resize y borrado de clips
- drag entre tracks
- duplicado con `Alt/Option + drag`
- bypass temporal de snap con `Shift + drag`
- selección múltiple por marquee con `Shift + drag` en el timeline
- mover y duplicar grupos de clips seleccionados
- copy/paste de clips al playhead
- nudge con flechas izquierda/derecha
- undo/redo
- reorder y duplicado de tracks
- mute, solo, rename, color, operador de unión y borrado de tracks
- librería de fórmulas funcional
- creación, edición, selección y borrado de fórmulas de librería
- drag de fórmulas desde library al timeline y a clips existentes
- clips con fórmula inline o referenciada por `formulaId`
- waveform preview opcional dentro de clips
- panel de fórmula evaluada opcional
- efectos de fórmula y efectos de audio
- persistencia automática en `localStorage`
- import/export de proyecto JSON
- export WAV offline

No asumir que `FormulaLibrary.vue` sigue siendo placeholder: hoy es parte real del flujo.

No asumir tampoco que toda la edición ocurre inline en `TimelineClip.vue`: la edición de fórmulas se hace mediante `FormulaInputDialog`, tanto para clips como para fórmulas de librería.

No asumir que el timeline sólo maneja selección simple: hoy existe `selectedClipIds`, marquee selection y operaciones de grupo.

## Objetivo actual

La prioridad sigue siendo consolidar el flujo de composición sobre timeline sin degradar reproducción, edición ni persistencia.

El sistema debe seguir permitiendo:

- crear clips vacíos y clips desde la librería
- editar la fórmula de un clip
- asignar y desasignar fórmulas de librería a clips
- mover clips dentro del track y entre tracks
- duplicar clips y grupos con modificadores
- cambiar duración de clips
- copiar y pegar clips en el playhead
- reproducir el timeline
- mover el playhead manualmente
- cambiar la fórmula activa según la posición del tiempo
- mutear o solear tracks sin romper playback
- combinar tracks con su `unionOperator`
- guardar, abrir y exportar proyectos

## Qué no asumir

No asumir que seguimos en una fase “sin audio”.
Hoy sí hay audio bytebeat funcional y cualquier cambio de timeline, fórmulas o efectos puede afectar reproducción.

No asumir que clip y fórmula son siempre la misma entidad.
Un clip puede:

- guardar `formula` inline
- referenciar una fórmula compartida con `formulaId`

No asumir que todos los cambios persistidos pertenecen sólo al dominio musical.
Hoy también se persisten flags de UI como:

- `showClipWaveforms`
- `showEvaluatedPanel`

No asumir paridad completa entre reproducción en vivo y export offline.
Hoy:

- `bytebeatService` aplica la cadena de efectos de audio en vivo
- `exportService` renderiza timeline + eval effects + `masterGain`

Si una tarea toca export, verificar ese camino explícitamente.

## Principios de desarrollo

### DRY

No duplicar lógica.

Si algo se reutiliza, moverlo a:

- `utils`
- `services`
- `composables`
- `stores`

Nunca copiar y pegar lógica entre timeline, library, effects, settings o export.

### Modularidad

Preferir módulos pequeños y explícitos.

Si un archivo supera aproximadamente 200–300 líneas, considerar dividirlo.

Especial cuidado con:

- `TimelineClip.vue`
- `TimelineTrack.vue`
- `Timeline.vue`
- `FormulaLibrary.vue`
- `EffectsPanel.vue`
- `dawStore.js`
- `useTransportPlayback.js`

porque concentran interacción y son candidatos naturales a crecer mal.

### Componentes pequeños

Cada componente Vue debe tener una responsabilidad clara.

La UI debe seguir componiéndose con subcomponentes en lugar de concentrar timeline, library, transport, effects o dialogs en un solo archivo.

## Stack

Frontend:

- Vue 3
- Vite
- Tailwind CSS 4

Estado global:

- Pinia

Audio:

- Web Audio API
- vendor `ByteBeat.js`

UI / iconografía:

- `lucide-vue-next`

No introducir dependencias pesadas sin justificación.

## Dependencias prohibidas

No usar:

- Monaco Editor
- librerías de timeline pesadas
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
Web Audio / File APIs / localStorage
```

Regla práctica:

- la UI no debe contener lógica compleja de timeline, fórmulas, selección, history o efectos si puede vivir en `services` o `composables`
- el store centraliza estado, acciones, clipboard e historial
- `timelineEngine` decide fórmula activa y combina tracks audibles
- `formulaService` resuelve fórmulas inline o referenciadas
- `formulaWaveformService` renderiza previews de waveform
- `bytebeatService` maneja integración de audio en vivo
- `projectPersistence` normaliza, serializa y restaura proyectos

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
  formulas: [],
  audioEffects: [],
  evalEffects: [],
  masterGain: 1,
  showEvaluatedPanel: true,
  showClipWaveforms: true,
  selectedClipIds: [],
  selectedClipId: null,
  selectedTrackId: null,
  selectedFormulaId: null,
  editingClipId: null,
  editingFormulaId: null,
  clipDragPreview: null,
  clipClipboard: null,
  historyPast: [],
  historyFuture: [],
  historyTransaction: null
}
```

Cada track debe modelarse así:

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

Cada clip debe modelarse así:

```js
{
  id: "clip-id",
  formula: "t*(t>>5|t>>8)", // opcional
  formulaId: "formula-id",   // opcional
  formulaName: "Bass",       // opcional
  start: 0,
  duration: 4
}
```

Cada fórmula de librería debe modelarse así:

```js
{
  id: "formula-id",
  name: "Bass",
  code: "t*(t>>5|t>>8)"
}
```

## Timeline

El timeline es el núcleo de la app.

Debe seguir soportando:

- grilla temporal
- clips por track
- selección simple y múltiple
- marquee selection
- drag dentro del track
- drag entre tracks
- resize de inicio y fin
- preview de drag entre tracks
- creación de clips por drag
- drop de fórmulas desde library
- loop region editable
- playhead y scrub
- zoom horizontal
- reorder de tracks

### Interacciones que ya existen y no deben romperse

- drag normal con snap activo
- `Shift + drag` para bypass temporal de snap
- `Alt/Option + drag` para duplicar al soltar
- `Shift + drag` sobre área vacía para marquee selection
- drag de fórmula desde library a lane para crear clip
- drag de fórmula desde library a clip para reasignar referencia
- mute por track
- solo por track
- copy/paste de clips
- nudge con flechas
- undo/redo
- borrado con `Delete` o `Backspace`
- `Space` para play/pause
- `L` para loop
- `Ctrl/Cmd + wheel` para zoom

Si se modifica una interacción del timeline o de fórmulas, verificar siempre estos casos.

## Playback

El playback actual usa bytebeat real.

Reglas:

- no eliminar ni degradar la integración con `bytebeatService`
- cualquier cambio en clips, tracks, fórmulas, `unionOperator`, mute o solo debe mantener consistente la fórmula activa
- `timelineEngine.getActiveFormula` debe ignorar tracks no audibles
- `formulaService` debe seguir resolviendo correctamente fórmulas inline y referenciadas
- los eval effects deben seguir aplicándose antes de enviar expresiones al engine de reproducción
- el panel evaluado debe seguir reflejando la expresión efectiva después de eval effects

## Fórmulas y librería

Estado actual:

- `FormulaLibrary.vue` ya no es placeholder
- existe selección de fórmula de librería
- existe alta, edición y borrado de fórmulas
- los clips pueden vincularse a una fórmula compartida o separarse de ella
- el doble click sobre clip abre la edición de fórmula del clip
- el doble click sobre fórmula de librería abre la edición de esa fórmula
- un clip inline puede promoverse a librería con `addClipFormulaToLibrary`

Si se modifica este flujo:

- no duplicar la lógica de resolución entre clip y librería
- usar `formulaService` para resolver nombre y código
- preservar el flujo `assignFormulaToClip`, `detachClipFormula` y `addClipFormulaToLibrary`

## Efectos

Hoy existen dos categorías:

- eval effects: transforman la expresión bytebeat antes de reproducir/renderizar
- audio effects: transforman la señal de audio en vivo

Actualmente están implementados:

- `Stereo Offset`
- `T Replacement`
- `Delay`
- `EQ`
- `BitCrusher`
- `Master Gain`

Si una tarea toca efectos:

- no mezclar efectos de fórmula con efectos de audio
- validar impacto en reproducción en vivo
- validar impacto en export offline por separado
- no romper reorder, enable/disable ni expand/collapse de efectos

## Persistencia y export

Hoy existe:

- guardado automático en `localStorage`
- import de proyecto JSON
- export de proyecto JSON
- reset de storage local
- export WAV offline
- normalización de proyectos con `version: 5`
- persistencia de `showClipWaveforms` y `showEvaluatedPanel`

Si se cambia el shape del proyecto:

- actualizar `projectPersistence`
- preservar compatibilidad de normalización cuando sea razonable
- revisar `demo.json`

## Responsabilidades del agente

Cuando el agente implemente una funcionalidad:

1. evaluar si requiere nuevos módulos
2. evitar duplicación de lógica
3. dividir componentes complejos
4. mantener la arquitectura clara
5. verificar impacto en playback, fórmulas, efectos, persistencia e historial

## Qué NO hacer

El agente no debe:

- crear archivos monolíticos
- duplicar lógica de drag, resize, selección, clipboard o resolución de fórmulas
- introducir dependencias innecesarias
- mezclar UI con lógica compleja de timeline, audio, history o persistencia
- romper playback bytebeat actual
- documentar features como implementadas si siguen siendo parciales
- asumir que export WAV replica exactamente la cadena de audio en vivo

## Prioridades actuales

Orden recomendado:

1. consolidar timeline y transport existentes
2. consolidar librería y flujo de fórmulas compartidas
3. mantener integridad de playback
4. mantener estable persistencia, import/export, historial y efectos
5. extender edición y organización de tracks sin reescribir la base

## Objetivo de esta etapa

Construir una base sólida para componer fórmulas en el tiempo, manteniendo alineadas:

- interacción de timeline
- estado global
- librería de fórmulas
- playback bytebeat
- persistencia de proyecto
- historial, clipboard y utilidades de edición

Las próximas iteraciones deben apoyarse en esta estructura, no reemplazarla sin necesidad.
