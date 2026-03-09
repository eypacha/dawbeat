# AGENTS.md

Este documento define cómo debe trabajar un agente dentro de este repositorio.

El objetivo es mantener el desarrollo:

- modular
- mantenible
- predecible
- fácil de extender

## Estado real del proyecto

El proyecto ya tiene una base funcional, no sólo una maqueta.

Hoy existen:

- reproducción bytebeat real en navegador
- transport con `play`, `pause`, `stop` y `loop`
- timeline con tracks y clips
- creación, movimiento, resize y borrado de clips
- drag entre tracks
- duplicado con `Alt/Option + drag`
- bypass temporal de snap con `Shift + drag`
- mute por track
- rename, color y borrado de tracks
- playhead reactivo al tiempo actual

Todavía no existe una biblioteca/editor lateral completa de fórmulas.
El componente `FormulaLibrary.vue` sigue siendo un placeholder.
La edición real de fórmulas hoy se hace inline en cada clip.

## Objetivo actual

La prioridad es consolidar el timeline y el flujo de composición.

El sistema debe seguir permitiendo:

- crear clips
- editar la fórmula de cada clip
- mover clips dentro del track y entre tracks
- duplicar clips con modificadores
- cambiar duración de clips
- reproducir el timeline
- mover el playhead con el tiempo de reproducción
- cambiar la fórmula activa según la posición del tiempo
- mutear tracks sin romper playback

## Qué no asumir

No asumir que seguimos en una fase “sin audio”.
Hoy sí hay audio bytebeat funcional y cualquier cambio de timeline puede afectar reproducción.

No asumir tampoco que la biblioteca lateral ya existe.
Si una tarea involucra edición de fórmulas, revisar primero si debe integrarse con el editor inline actual o si realmente corresponde construir la biblioteca.

## Principios de desarrollo

### DRY

No duplicar lógica.

Si algo se reutiliza, moverlo a:

- `utils`
- `services`
- `composables`
- `stores`

Nunca copiar y pegar lógica entre componentes del timeline.

### Modularidad

Preferir módulos pequeños y explícitos.

Si un archivo supera aproximadamente 200–300 líneas, considerar dividirlo.

Especial cuidado con:

- `TimelineClip.vue`
- `TimelineTrack.vue`
- `dawStore.js`

porque concentran mucha interacción y son candidatos naturales a crecer mal.

### Componentes pequeños

Cada componente Vue debe tener una responsabilidad clara.

La estructura del timeline debe seguir componiéndose con subcomponentes en lugar de concentrar toda la UI en un solo archivo.

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
Bytebeat Service
↓
Web Audio
```

Regla práctica:

- la UI no debe contener lógica compleja de timeline si puede vivir en `services`
- el store centraliza estado y acciones
- `timelineEngine` decide fórmula activa
- `bytebeatService` maneja integración de audio

## Estructura actual

```text
src/
  components/
    boot/
      StartScreen.vue
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
      TextInputDialog.vue

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
  selectedClipId: null,
  selectedTrackId: null,
  editingClipId: null,
  clipDragPreview: null
}
```

Cada track debe modelarse así:

```js
{
  id: "track-id",
  color: "#6366f1",
  muted: false,
  name: undefined,
  clips: []
}
```

Cada clip debe modelarse así:

```js
{
  id: "clip-id",
  formula: "t*(t>>5|t>>8)",
  start: 0,
  duration: 4
}
```

## Timeline

El timeline es el núcleo de la app.

Debe seguir soportando:

- grilla temporal
- clips por track
- selección de clip
- drag dentro del track
- drag entre tracks
- resize de inicio y fin
- preview de drag entre tracks
- creación de clips por drag
- loop region
- playhead

### Interacciones que ya existen y no deben romperse

- drag normal con snap activo
- `Shift + drag` para bypass temporal de snap
- `Alt/Option + drag` para duplicar al soltar
- mute por track
- borrado con `Delete` o `Backspace`

Si se modifica una interacción del timeline, verificar siempre estos casos.

## Playback

El playback actual usa bytebeat real.

Reglas:

- no eliminar ni degradar la integración con `bytebeatService`
- cualquier cambio en clips, tracks o mute debe mantener consistente la fórmula activa
- los tracks muteados no deben contribuir a `getActiveFormula`

## Biblioteca de fórmulas

Estado actual:

- `FormulaLibrary.vue` es placeholder
- la edición real de la fórmula ocurre inline en `TimelineClip.vue`

Por ahora no introducir Monaco ni editores pesados.

Si se implementa la biblioteca lateral:

- debe reflejar el clip seleccionado
- debe escribir en el store
- no debe duplicar la lógica de edición inline sin una refactorización clara

## Responsabilidades del agente

Cuando el agente implemente una funcionalidad:

1. evaluar si requiere nuevos módulos
2. evitar duplicación de lógica
3. dividir componentes complejos
4. mantener la arquitectura clara
5. verificar impacto en playback además de la UI

## Qué NO hacer

El agente no debe:

- crear archivos monolíticos
- duplicar lógica de drag o resize
- introducir dependencias innecesarias
- mezclar UI con lógica compleja de timeline
- romper playback bytebeat actual
- documentar features como implementadas si siguen siendo placeholders

## Prioridades actuales

Orden recomendado:

1. consolidar timeline y transport existentes
2. mejorar editor/biblioteca de fórmulas
3. mantener integridad de playback
4. extender edición y organización de tracks
5. preparar futuras integraciones sin reescribir la base

## Objetivo de esta etapa

Construir una base sólida para componer con fórmulas en el tiempo, manteniendo alineadas:

- interacción de timeline
- estado global
- playback bytebeat

Las próximas iteraciones deben apoyarse en esta estructura, no reemplazarla sin necesidad.
