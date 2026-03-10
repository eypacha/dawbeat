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
- transport con `play`, `pause`, `stop`, `loop` y scrub del playhead
- zoom horizontal del timeline
- timeline con tracks y clips
- creación, movimiento, resize y borrado de clips
- drag entre tracks
- duplicado con `Alt/Option + drag`
- bypass temporal de snap con `Shift + drag`
- mute y solo por track
- rename, color y borrado de tracks
- librería de fórmulas funcional
- creación, edición, selección y borrado de fórmulas de librería
- drag de fórmulas desde library al timeline y a clips existentes
- clips con fórmula inline o referenciada por `formulaId`
- efectos de fórmula y efectos de audio
- persistencia automática en `localStorage`
- import/export de proyecto JSON
- export WAV offline

No asumir que `FormulaLibrary.vue` sigue siendo placeholder: hoy es parte real del flujo.

No asumir tampoco que toda la edición ocurre inline en `TimelineClip.vue`: la edición de fórmulas se hace mediante `FormulaInputDialog`, tanto para clips como para fórmulas de librería.

## Objetivo actual

La prioridad sigue siendo consolidar el flujo de composición sobre timeline sin degradar reproducción, edición ni persistencia.

El sistema debe seguir permitiendo:

- crear clips vacíos y clips desde la librería
- editar la fórmula de un clip
- asignar y desasignar fórmulas de librería a clips
- mover clips dentro del track y entre tracks
- duplicar clips con modificadores
- cambiar duración de clips
- reproducir el timeline
- mover el playhead manualmente
- cambiar la fórmula activa según la posición del tiempo
- mutear o solear tracks sin romper playback
- guardar, abrir y exportar proyectos

## Qué no asumir

No asumir que seguimos en una fase “sin audio”.
Hoy sí hay audio bytebeat funcional y cualquier cambio de timeline, fórmulas o efectos puede afectar reproducción.

No asumir que clip y fórmula son siempre la misma entidad.
Un clip puede:

- guardar `formula` inline
- referenciar una fórmula compartida con `formulaId`

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

Nunca copiar y pegar lógica entre componentes del timeline, panel de efectos y librería.

### Modularidad

Preferir módulos pequeños y explícitos.

Si un archivo supera aproximadamente 200–300 líneas, considerar dividirlo.

Especial cuidado con:

- `TimelineClip.vue`
- `TimelineTrack.vue`
- `Timeline.vue`
- `dawStore.js`
- `useTransportPlayback.js`

porque concentran interacción y son candidatos naturales a crecer mal.

### Componentes pequeños

Cada componente Vue debe tener una responsabilidad clara.

La UI debe seguir componiéndose con subcomponentes en lugar de concentrar timeline, library, transport o effects en un solo archivo.

## Stack

Frontend:

- Vue 3
- Vite
- TailwindCSS

Estado global:

- Pinia

Audio:

- Web Audio API
- vendor `ByteBeat.js`

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

- la UI no debe contener lógica compleja de timeline, fórmulas o efectos si puede vivir en `services` o `composables`
- el store centraliza estado y acciones
- `timelineEngine` decide fórmula activa
- `formulaService` resuelve fórmulas inline o referenciadas
- `bytebeatService` maneja integración de audio en vivo
- `projectPersistence` normaliza, serializa y restaura proyectos

## Estructura actual

```text
src/
  components/
    boot/
      StartScreen.vue
    effects/
      EffectsPanel.vue
      EvalEffectItem.vue
      AudioDelayItem.vue
      AudioEqItem.vue
      AudioBitCrusherItem.vue
      AudioMasterGainItem.vue
    library/
      FormulaLibrary.vue
    timeline/
      Playhead.vue
      Timeline.vue
      TimelineAddTrackRow.vue
      TimelineClip.vue
      TimelineClipPreview.vue
      TimelineLoopRegion.vue
      TimelineTrack.vue
      TrackColorPalette.vue
    transport/
      TransportBar.vue
    ui/
      ConfirmDialog.vue
      ContextMenu.vue
      FormulaInputDialog.vue
      SettingsModal.vue
      TextInputDialog.vue

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
  selectedClipId: null,
  selectedTrackId: null,
  selectedFormulaId: null,
  editingClipId: null,
  editingFormulaId: null,
  clipDragPreview: null
}
```

Cada track debe modelarse así:

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
- selección de clip y track
- drag dentro del track
- drag entre tracks
- resize de inicio y fin
- preview de drag entre tracks
- creación de clips por drag
- drop de fórmulas desde library
- loop region editable
- playhead y scrub
- zoom horizontal

### Interacciones que ya existen y no deben romperse

- drag normal con snap activo
- `Shift + drag` para bypass temporal de snap
- `Alt/Option + drag` para duplicar al soltar
- drag de fórmula desde library a lane para crear clip
- drag de fórmula desde library a clip para reasignar referencia
- mute por track
- solo por track
- borrado con `Delete` o `Backspace`
- `Space` para play/pause
- `L` para loop

Si se modifica una interacción del timeline o de fórmulas, verificar siempre estos casos.

## Playback

El playback actual usa bytebeat real.

Reglas:

- no eliminar ni degradar la integración con `bytebeatService`
- cualquier cambio en clips, tracks, fórmulas o mute/solo debe mantener consistente la fórmula activa
- `timelineEngine.getActiveFormula` debe ignorar tracks no audibles
- `formulaService` debe seguir resolviendo correctamente fórmulas inline y referenciadas
- los eval effects deben seguir aplicándose antes de enviar expresiones al engine de reproducción

## Fórmulas y librería

Estado actual:

- `FormulaLibrary.vue` ya no es placeholder
- existe selección de fórmula de librería
- existe alta, edición y borrado de fórmulas
- los clips pueden vincularse a una fórmula compartida o separarse de ella
- el doble click sobre clip abre la edición de fórmula del clip
- el doble click sobre fórmula de librería abre la edición de esa fórmula

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
- `Delay`
- `EQ`
- `BitCrusher`
- `Master Gain`

Si una tarea toca efectos:

- no mezclar efectos de fórmula con efectos de audio
- validar impacto en reproducción en vivo
- validar impacto en export offline por separado

## Persistencia y export

Hoy existe:

- guardado automático en `localStorage`
- import de proyecto JSON
- export de proyecto JSON
- reset de storage local
- export WAV offline

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
5. verificar impacto en playback, fórmulas, efectos y persistencia

## Qué NO hacer

El agente no debe:

- crear archivos monolíticos
- duplicar lógica de drag, resize o resolución de fórmulas
- introducir dependencias innecesarias
- mezclar UI con lógica compleja de timeline, audio o persistencia
- romper playback bytebeat actual
- documentar features como implementadas si siguen siendo parciales
- asumir que export WAV replica exactamente la cadena de audio en vivo

## Prioridades actuales

Orden recomendado:

1. consolidar timeline y transport existentes
2. consolidar librería y flujo de fórmulas compartidas
3. mantener integridad de playback
4. mantener estable persistencia, import/export y efectos
5. extender edición y organización de tracks sin reescribir la base

## Objetivo de esta etapa

Construir una base sólida para componer fórmulas en el tiempo, manteniendo alineadas:

- interacción de timeline
- estado global
- librería de fórmulas
- playback bytebeat
- persistencia de proyecto

Las próximas iteraciones deben apoyarse en esta estructura, no reemplazarla sin necesidad.
