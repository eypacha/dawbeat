# ROADMAP.md

Este documento define el **plan de desarrollo para construir la UI del Bytebeat DAW**.

El objetivo de esta etapa es **construir completamente la interfaz del sistema** antes de integrar el motor de audio.

La UI debe permitir **componer en una timeline utilizando fórmulas bytebeat**, aunque el audio todavía no esté implementado.

---

# Principios de esta etapa

En esta fase el proyecto se enfoca en:

- interfaz
- interacción
- arquitectura modular
- estado global
- timeline funcional

No se implementará todavía:

- motor de audio
- generación de sonido
- visualizadores de audio
- presets
- export

El sistema debe poder **simular una reproducción visual del timeline**.

---

# Tecnologías

Frontend:

- Vue 3
- Vite
- TailwindCSS
- Pinia

Rendering UI:

- **Pinta Compositor API**

La timeline debe construirse utilizando la **Pinta Compositor API** para manejar el renderizado y la composición visual de los elementos del timeline.

---

# Resultado esperado de esta fase

Al finalizar esta etapa el sistema debe permitir:

- crear clips
- editar fórmulas
- mover clips en la timeline
- cambiar duración de clips
- seleccionar clips
- reproducir la timeline visualmente
- ver el playhead avanzar
- cambiar de fórmula al avanzar el tiempo

Aunque todavía no haya audio.

---

# Fase 1 — Base del proyecto

Objetivo: preparar la estructura del proyecto.

Tareas:

- crear proyecto con Vite
- configurar Vue 3
- instalar TailwindCSS
- instalar Pinia
- crear estructura de carpetas
- crear layout principal de la aplicación

Estructura base esperada:

```

src/
components/
stores/
services/
composables/
utils/

```

Resultado esperado:

Aplicación Vue funcionando con layout vacío.

---

# Fase 2 — Store del DAW

Objetivo: implementar el estado global del sistema.

Crear el store:

```

stores/dawStore.js

```

Estado inicial:

```

{
playing: false,
time: 0,
zoom: 1,

clips: [],

selectedClipId: null
}

```

Acciones necesarias:

- play
- stop
- setTime
- addClip
- updateClip
- selectClip
- moveClip

Resultado esperado:

La aplicación puede manejar el estado del timeline desde el store.

---

# Fase 3 — Layout principal

Objetivo: construir la estructura visual básica.

Layout inicial:

```

+-------------------------------------+
| TransportBar                        |
+-------------------+-----------------+
| FormulaLibrary    | Timeline        |
|                   |                 |
|                   |                 |
+-------------------+-----------------+

```

Componentes:

```

TransportBar.vue
FormulaLibrary.vue
Timeline.vue

```

Resultado esperado:

La UI principal visible aunque todavía sin funcionalidad completa.

---

# Fase 4 — Biblioteca de fórmulas

Objetivo: crear una biblioteca simple para fórmulas bytebeat.

Características:

- textarea
- resaltado de sintaxis básico
- conexión con el clip seleccionado
- edición reactiva

Comportamiento:

Si hay un clip seleccionado:

- la biblioteca muestra su fórmula
- editar la fórmula actualiza el clip

Resultado esperado:

El usuario puede editar fórmulas asociadas a clips.

---

# Fase 5 — Timeline base

Objetivo: crear la estructura visual del timeline.

Componentes:

```

timeline/
Timeline.vue
TimelineGrid.vue
TimelineTrack.vue
TimelineClip.vue
Playhead.vue

```

Características:

- grid temporal
- una pista inicial
- visualización de clips
- escala temporal simple

Resultado esperado:

Clips visibles en la timeline.

---

# Fase 6 — Sistema de clips

Objetivo: permitir crear y manipular clips.

Funcionalidades:

- crear clip
- seleccionar clip
- mover clip horizontalmente
- cambiar duración

Cada clip contiene:

```

{
id,
formula,
start,
duration
}

```

Resultado esperado:

La timeline funciona como un editor básico.

---

# Fase 7 — Playhead

Objetivo: implementar el cursor de tiempo.

Características:

- línea vertical que indica el tiempo actual
- se mueve cuando el sistema está en reproducción

Implementación:

```

requestAnimationFrame

```

El tiempo se actualiza en el store.

Resultado esperado:

El playhead avanza visualmente.

---

# Fase 8 — Reproducción de timeline

Objetivo: conectar el playhead con los clips.

Comportamiento:

Cuando el tiempo cambia:

1. buscar el clip activo
2. identificar su fórmula
3. actualizar el estado activo del sistema

Esto simula el comportamiento futuro del motor de audio.

Resultado esperado:

El sistema puede recorrer fórmulas a lo largo del tiempo.

---

# Fase 9 — Interacciones del timeline

Objetivo: mejorar la experiencia de edición.

Agregar:

- drag & drop de clips
- resize de clips
- snapping básico al grid
- selección visual

Resultado esperado:

Timeline usable para composición.

---

# Fase 10 — Refinamiento UI

Objetivo: mejorar la experiencia visual.

Mejoras:

- estilos
- colores de clips
- hover states
- cursor feedback
- zoom del timeline

Resultado esperado:

Interfaz clara y utilizable.

---

# Fase futura (fuera de este roadmap)

No pertenece a esta fase:

- motor bytebeat
- generación de audio
- AudioWorklet
- visualización de waveform
- export WAV
- parámetros en fórmulas

Estas funcionalidades se implementarán **después de que la UI esté consolidada**.

---

# Objetivo final de este roadmap

Construir una **interfaz robusta para componer fórmulas bytebeat en una timeline**, preparada para integrar el motor de audio en etapas posteriores.
