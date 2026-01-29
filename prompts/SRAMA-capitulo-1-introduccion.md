# Prompt de Orquestación SRAMA: Capítulo 1 - Introducción

## Instrucciones de Uso

### Archivos a incluir como contexto (@)

Antes de enviar este prompt, asegúrate de incluir los siguientes archivos como contexto:

**Obligatorios:**

- `@core/Base de la tesis.md`
- `@core/Indice de contenidos.md`
- `@.claude/skills/academic-writing-style.md`
- `@.claude/agents/srama-orchestrator.md`
- `@rules/cross-references.md`

**Opcional pero recomendado:**

- `@.claude/agents/synthesis-agent.md`
- `@.claude/agents/continuity-agent.md`
- `@.claude/agents/drafting-agent.md`

---

## Prompt

```
Ejecuta el sistema SRAMA (Sistema de Redacción Académica Multi-Agente) para generar el contenido completo del Capítulo 1: "Introducción: El Cuerpo Danzante en la Encrucijada Digital" de mi tesis doctoral.

## Contexto de la Tesis

**Título**: "Resistencia Encarnada: Hacia un Marco Teórico Interdisciplinario para el Análisis Crítico y la Co-Creación en la Danza ante la Inteligencia Artificial"

**Hipótesis Central**: La construcción de un marco teórico interdisciplinario que integre la cognición corporeizada, la economía laboral, la estética del valor y la poética de la danza —atravesado por una lente ético-política— permitirá no solo identificar los mecanismos de resistencia a la automatización, sino también modelar posibilidades de co-creación.

## Estructura del Capítulo 1

Según el índice de contenidos, este capítulo debe cubrir:

### 1.1. Contexto: La Era de la IA Generativa y la "Gran Dislocación" Creativa
- Introducción al panorama actual.
- La tensión entre creatividad humana y automatización.

### 1.2. Planteamiento del Problema de Investigación (Ampliado)
- 1.2.1. La Singularidad de la Danza como "Caso Límite" Corporal.
- 1.2.2. El Doble Vacío Conceptual: Analítico y Ético-Político.
- *Referencia principal*: Sección 2 de `Base de la tesis.md`.

### 1.3. Justificación del Enfoque Teórico-Crítico
- Por qué es necesaria una aproximación interdisciplinaria.

### 1.4. Pregunta de Investigación Central e Hipótesis de Trabajo (Revisada)
- Formulación clara de la pregunta y la hipótesis.
- *Referencia principal*: Sección 3 de `Base de la tesis.md`.

### 1.5. Objetivos de la Investigación
- Objetivo general y objetivos específicos.
- *Referencia principal*: Sección 4 de `Base de la tesis.md`.

### 1.6. Relevancia y Justificación: ¿Por qué ahora? ¿Por qué la danza?
- Importancia académica, social y cultural de la investigación.
- *Referencia principal*: Sección 8 ("Contribución Original") de `Base de la tesis.md` y Sección 5 ("El Marco...").

### 1.7. Estructura de la Tesis
- Breve descripción de los capítulos subsiguientes, basándose en `Indice de contenidos.md`.

## Sources Disponibles

Para este capítulo, se cuenta con **investigación profunda (Deep Research)** generada específicamente, además de los documentos core:

**Documentos Core:**
- `@core/Base de la tesis.md`
- `@core/Indice de contenidos.md`

**Sources de Investigación (Generados por Deep Research):**
- `@sections/1-introduccion/sources/DR_1.1-contexto-gran-dislocacion.md` (Para sección 1.1)
- `@sections/1-introduccion/sources/DR_1.2-estado-cuestion-doble-vacio.md` (Para sección 1.2 y 1.6)

**Instrucción Crítica:**
Si estos archivos no existen en `sections/1-introduccion/sources/`, **DETÉN LA EJECUCIÓN** y solicita al usuario que ejecute primero los prompts de investigación ubicados en `sections/1-introduccion/prompts/`.

El agente deberá:
1.  **Sintetizar** los hallazgos de los documentos de Deep Research.
2.  **Integrarlos** con la estructura argumental de `Base de la tesis.md`.
3.  **Construir** la narrativa de la "Gran Dislocación" y el "Doble Vacío" basándose en estas investigaciones.

## Requisitos de Ejecución

### Fase 1: Síntesis y Planificación
1. Analiza `Base de la tesis.md` e `Indice de contenidos.md`.
2. Genera `sections/1-introduccion/_section-outline.md` con:
   - Una estructura detallada que expanda los puntos del índice.
   - Identificación de los conceptos clave a introducir.
   - Propuesta de narrativa que lleve del contexto general al problema específico de la danza.

### Fase 2: Redacción y Composición
1. Genera archivos de contenido en `sections/1-introduccion/content/`:
   - Un archivo por subsección principal (e.g., `1.1-contexto.md`, `1.2-problema.md`).
   - Formato APA 7 para citas.
   - Anchors en todos los encabezados segun `rules/cross-references.md`.

### Fase 3: Refinamiento y Evaluación
1. Aplica el sistema IRA para humanizar el texto.
2. Genera reporte de evaluación en `sections/1-introduccion/evaluation/`.

## Especificaciones de Estilo

- **Idioma**: Español Peninsular
- **Citas**: APA 7ª edición
- **Registro**: Académico formal, persuasivo y claro.
- **Persona**: Primera persona del plural ("Proponemos", "Analizamos") para posicionamiento argumentativo.
- **Tono**: Debe transmitir la urgencia y relevancia del tema sin caer en sensacionalismos.

## Criterios de Calidad

El contenido generado debe:
1. **Capturar la atención** del lector desde el inicio.
2. **Definir con precisión** el problema de investigación (el "doble vacío").
3. **Presentar la hipótesis** de manera clara y contundente.
4. **Justificar la metodología interdisciplinaria** (que se detallará en el Cap. 2).
5. **Proporcionar un mapa claro** de la tesis en la sección 1.7.

## Outputs Esperados

Al finalizar, debo tener:
- [ ] `_section-outline.md` en la raíz de la sección
- [ ] Archivos de contenido en `content/`
- [ ] `crossref-index.json` en `references/`
- [ ] Reporte de evaluación en `evaluation/`

Por favor, ejecuta el pipeline completo del sistema SRAMA.
```

---

## Checklist Pre-Ejecución

Antes de lanzar, verifica:

- [ ] Todos los archivos de contexto obligatorios están incluidos.
- [ ] Las carpetas `content/` y `evaluation/` existen en `sections/1-introduccion/`.
- [ ] Tienes acceso al sistema de agentes SRAMA.

## Tiempo Estimado

- Fase 1 (Síntesis): ~5 minutos
- Fase 2 (Redacción): ~20-30 minutos
- Fase 3 (Refinamiento): ~10 minutos

Total estimado: 35-45 minutos.
