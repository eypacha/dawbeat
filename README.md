# Bytebeat DAW

Un **DAW (Digital Audio Workstation)** diseñado específicamente para componer música utilizando **fórmulas bytebeat**.

En lugar de trabajar con clips de audio o MIDI, este sistema genera sonido **directamente a partir de expresiones matemáticas** evaluadas en tiempo real.

Cada sonido se define mediante una fórmula que produce muestras de audio a partir de la variable de tiempo `t`.

El objetivo del proyecto es crear un entorno simple y ligero para **explorar composición algorítmica y síntesis sonora minimalista**.

---

# Concepto

Los DAW tradicionales manipulan:

- clips de audio
- notas MIDI
- instrumentos virtuales

Bytebeat DAW manipula **código**.

Cada sonido es una expresión matemática.

Ejemplo:

```

t * (t >> 5 | t >> 8)

```

Esta fórmula genera una estructura rítmica completa.

El sistema permite reproducir, experimentar y organizar estas fórmulas dentro de un entorno musical.

---

# Primera decisión de diseño

En la **primera versión del proyecto** las fórmulas:

- **no tendrán parámetros externos**
- solo utilizarán la variable `t`

Esto simplifica mucho:

- el motor de audio
- el compilador
- la interfaz
- la ejecución en tiempo real

Ejemplo de fórmula válida:

```

t >> 4 | t >> 5

```

Ejemplo de fórmula que **NO se usará en esta etapa**:

```

t * a & (t >> b)

```

La introducción de parámetros automatizables podrá evaluarse en versiones futuras.

---

# Objetivos del proyecto

- Crear una herramienta dedicada a **música bytebeat**
- Permitir **exploración sonora rápida**
- Mantener el sistema **extremadamente ligero**
- Ofrecer **visualización del sonido**
- Facilitar el descubrimiento de nuevas fórmulas

El sistema debe sentirse más como **un instrumento creativo** que como un DAW tradicional.

---

# Stack tecnológico

Frontend:

- Vue 3
- Vite
- TailwindCSS
- Pinia

Audio:

- Web Audio API
- AudioWorklet (para estabilidad en tiempo real)

Motor bytebeat:

Basado en:

https://github.com/greggman/html5bytebeat

Editor de fórmulas:

- editor simple
- sin Monaco
- resaltado de sintaxis básico

---

# Idea central

El sonido se genera evaluando una fórmula miles de veces por segundo.

Conceptualmente:

```

sample = formula(t)

```

Donde:

- `t` = índice de muestra
- `sample` = valor de audio generado

Luego el motor convierte ese valor en señal de audio reproducible.

---

# Características planeadas

## Editor de fórmulas

Un editor simple optimizado para fórmulas bytebeat.

Funciones:

- resaltado de sintaxis
- preview inmediato
- presets
- historial

---

## Reproducción en tiempo real

El usuario escribe una fórmula y el sistema la ejecuta inmediatamente.

Esto permite un flujo de trabajo de **exploración directa**.

---

## Visualización

El sistema incluirá visualizaciones básicas del audio:

- osciloscopio
- amplitud

Las visualizaciones ayudan a entender el comportamiento de las fórmulas.

---

## Biblioteca de fórmulas

El sistema incluirá una pequeña colección de fórmulas conocidas para experimentar.

Ejemplos:

```

t * (t >> 5 | t >> 8)

```
```

t >> 6 & t >> 8

```
```

t * (t >> 11 & t >> 8)

```

Estas fórmulas sirven como punto de partida.

---

# Estructura del proyecto

Estructura inicial prevista:

```

src/
engine/
bytebeatEngine.js
compiler.js
audioWorklet.js

components/
FormulaEditor.vue
Transport.vue
Oscilloscope.vue

stores/
dawStore.js

utils/
syntaxHighlight.js

```

---

# Bytebeat

Bytebeat es una técnica para generar música usando expresiones extremadamente pequeñas.

El principio básico es:

- usar la variable `t`
- combinar operadores bitwise
- producir patrones rítmicos y melódicos

Operadores comunes:

- `>>`
- `<<`
- `&`
- `|`
- `^`
- `+`
- `-`
- `*`

Ejemplo:

```

t * (t >> 8)

```

---

# Filosofía de diseño

## Simplicidad

La herramienta debe ser simple.

La complejidad está en las fórmulas, no en la interfaz.

---

## Experimentación

La edición debe tener respuesta inmediata.

Explorar nuevas fórmulas es el objetivo principal.

---

## Ligereza

El sistema debe ser pequeño y rápido.

Se evitarán dependencias pesadas.

---

## Descubrimiento

El sistema debe facilitar encontrar sonidos inesperados.

La exploración es parte fundamental de la experiencia.

---

# Estado del proyecto

Etapa inicial.

Prioridades actuales:

1. integrar motor bytebeat
2. implementar pipeline de audio
3. crear editor de fórmulas
4. reproducción en tiempo real
5. visualización básica

El sistema de timeline y secuenciación podrá evaluarse en fases posteriores.

---

# Inspiración

- experimentos clásicos de bytebeat
- live coding
- trackers musicales
- herramientas de composición algorítmica

---

# Licencia

Por definir.