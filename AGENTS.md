# AGENTS.md

Este documento define **cómo debe trabajar un agente dentro de este repositorio**.

El objetivo es garantizar que el desarrollo sea:

- modular
- mantenible
- predecible
- fácil de extender

El agente debe seguir estas reglas estrictamente.

---

# Objetivo actual del proyecto

El proyecto se encuentra en **fase inicial de UI**.

El objetivo de esta etapa es construir **la interfaz del DAW**, no el motor de audio.

La prioridad es implementar un **timeline funcional para fórmulas bytebeat**.

El sistema debe permitir:

- crear clips
- asignar fórmulas a clips
- mover clips en el timeline
- reproducir el timeline
- mover el cursor de tiempo (playhead)
- cambiar de fórmula según la posición del tiempo

En esta fase **NO se implementará audio real**.

El motor bytebeat se integrará en etapas posteriores.

---

# Principios de desarrollo

## DRY (Don't Repeat Yourself)

No duplicar lógica.

Si un fragmento de código puede reutilizarse, debe moverse a:

- `utils`
- `services`
- `composables`
- `stores`

Nunca copiar y pegar lógica entre componentes.

---

## Modularidad

El sistema debe dividirse en **módulos pequeños y claros**.

Evitar archivos gigantes.

Regla general:

- si un archivo supera aproximadamente **200–300 líneas**, considerar dividirlo.

Ejemplo correcto:

```

timeline/
Timeline.vue
TimelineTrack.vue
TimelineClip.vue
Playhead.vue

```

Ejemplo incorrecto:

```

Timeline.vue (1000 líneas)

```

---

## Componentes pequeños

Cada componente Vue debe tener **una sola responsabilidad**.

Ejemplo correcto:

```

Timeline.vue
├─ TimelineGrid.vue
├─ TimelineTrack.vue
│    └─ TimelineClip.vue
└─ Playhead.vue

```

El agente debe crear subcomponentes cuando la complejidad crezca.

---

# Stack tecnológico

Frontend:

- Vue 3
- Vite
- TailwindCSS

Estado global:

- Pinia

No introducir dependencias pesadas sin justificación.

---

# Dependencias prohibidas

No usar:

- Monaco Editor
- librerías de timeline pesadas
- frameworks UI completos

La UI debe ser **ligera y controlada por el proyecto**.

---

# Arquitectura del sistema

Arquitectura esperada:

```

UI
↓
Store
↓
Services
↓
Engine (futuro)

```

Actualmente solo se trabaja en **UI + Store**.

---

# Estructura del proyecto

Estructura esperada:

```

src/

components/

transport/
TransportBar.vue

library/
FormulaLibrary.vue

timeline/
Timeline.vue
TimelineGrid.vue
TimelineTrack.vue
TimelineClip.vue
Playhead.vue

stores/
dawStore.js

services/
timelineService.js

composables/
useTimeline.js

utils/
timeUtils.js

```

El agente debe respetar esta estructura.

---

# Store central

El estado global del DAW debe manejarse con **Pinia**.

Store principal:

```

dawStore

```

Estado esperado:

```

{
playing: false,
time: 0,
zoom: 1,

clips: [],

selectedClipId: null
}

```

Ejemplo de clip:

```

{
id: "clip1",
formula: "t*(t>>5|t>>8)",
start: 0,
duration: 4
}

```

---

# Timeline

El timeline es el **núcleo de la interfaz**.

Debe permitir:

- mostrar una grilla temporal
- mostrar clips
- mover clips
- cambiar duración de clips
- seleccionar clips
- mostrar playhead

El timeline debe diseñarse para ser **extensible**, ya que en el futuro controlará el motor de audio.

---

# Playhead

El playhead representa el tiempo actual.

Debe moverse cuando:

- el usuario presiona play
- el tiempo avanza

El movimiento puede implementarse con:

```

requestAnimationFrame

```

El playhead debe ser **reactivo al estado del store**.

---

# Biblioteca de fórmulas

La biblioteca de fórmulas debe ser simple.

No usar Monaco.

Debe incluir:

- textarea
- resaltado de sintaxis ligero

Las fórmulas solo utilizan la variable:

```

t

```

Ejemplo:

```

t*(t>>5|t>>8)

```

---

# Interacción entre biblioteca y timeline

Cuando se selecciona un clip:

- la biblioteca debe mostrar su fórmula
- editar la fórmula debe modificar el clip seleccionado

Flujo esperado:

```

Seleccionar clip
↓
Biblioteca muestra fórmula
↓
Usuario modifica fórmula
↓
Store actualiza clip

```

---

# Responsabilidades del agente

Cuando el agente implemente una funcionalidad:

1. evaluar si requiere nuevos módulos
2. evitar duplicación de lógica
3. dividir componentes complejos
4. mantener la arquitectura clara
5. escribir código legible

---

# Qué NO hacer

El agente NO debe:

- crear archivos monolíticos
- duplicar lógica
- introducir dependencias innecesarias
- mezclar UI con lógica compleja
- implementar audio en esta etapa

---

# Prioridades actuales

Orden recomendado de desarrollo:

1. estructura base del proyecto
2. store del DAW
3. biblioteca de fórmulas
4. timeline base
5. clips
6. playhead
7. interacción editor + timeline

---

# Objetivo de esta etapa

Construir una **UI sólida para componer con fórmulas en el tiempo**.

El motor bytebeat se integrará posteriormente sin requerir cambios estructurales en la interfaz.
