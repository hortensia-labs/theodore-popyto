# Prompt de Orquestación SRAMA: Capítulo 3 - Fundamentos Teóricos I

## Instrucciones de Uso

### Archivos a incluir como contexto (@)

Antes de enviar este prompt, asegúrate de incluir los siguientes archivos como contexto:

**Obligatorios:**

- `@core/Base de la tesis.md`
- `@core/Indice de contenidos.md`
- `@.claude/skills/academic-writing-style.md`
- `@.claude/agents/srama-orchestrator.md`
- `@rules/cross-references.md`

**Sources del Capítulo 3** (todos):

- `@sections/3-fundamentos-1/sources/`

**Opcional pero recomendado:**

- `@.claude/agents/synthesis-agent.md`
- `@.claude/agents/continuity-agent.md`
- `@.claude/agents/drafting-agent.md`

---

## Prompt

```
Ejecuta el sistema SRAMA (Sistema de Redacción Académica Multi-Agente) para generar el contenido completo del Capítulo 3: "Fundamentos Teóricos I: La Singularidad de la Práctica Dancística" de mi tesis doctoral.

## Contexto de la Tesis

**Título**: "Resistencia Encarnada: Hacia un Marco Teórico Interdisciplinario para el Análisis Crítico y la Co-Creación en la Danza ante la Inteligencia Artificial"

**Hipótesis Central**: La construcción de un marco teórico interdisciplinario que integre la cognición corporeizada, la economía laboral, la estética del valor y la poética de la danza —atravesado por una lente ético-política— permitirá no solo identificar los mecanismos de resistencia a la automatización, sino también modelar posibilidades de co-creación.

## Estructura del Capítulo 3

Según el índice de contenidos, este capítulo debe cubrir:

### 3.1. Pilar de la Cognición Corporeizada (Embodied Cognition)
- 3.1.1. El Cuerpo como Lugar de Conocimiento: Körper vs. Leib
- 3.1.2. Conocimiento Tácito, Inteligencia Kinestésica y Juicio Encarnado
- 3.1.3. La Presencia Escénica como Fenómeno Emergente y Relacional

### 3.2. Pilar de la Estética y Teoría del Valor Artístico
- 3.2.1. Intencionalidad, Autenticidad y Expresividad
- 3.2.2. La Co-construcción del Significado y la Empatía Kinestésica
- 3.2.3. El Valor de la Finitud: Fragilidad y Efimeridad en la Performance

### 3.3. Pilar de la Poética de la Danza
- 3.3.1. El Lenguaje del Movimiento: Sintaxis y Semántica
- 3.3.2. Improvisación y Composición como Prácticas de Pensamiento
- 3.3.3. El Anclaje Cultural e Histórico del Gesto

### 3.4. Síntesis Intermedia I
- Hacia una Definición de lo Irreductiblemente Humano en la Danza

## Sources Disponibles

Los materiales de investigación están en `sections/3-fundamentos-1/sources/` e incluyen:

**Sección 3.1 (Cognición Corporeizada):**
- 3.1 Cognición Corporeizada y Danza como Resistencia...
- 3.1.1 El cuerpo como lugar de Conocimiento y Creación.md
- 3.1.2. Conocimiento Tácito Kinestésico e Inteligencia Motriz.md
- 3.1.3. Enacción, Percepción Activa y Conciencia Corporal.md
- 3.1.4 Síntesis - La Cognición Corporeizada como Barrera Fundamental...

**Sección 3.2 (Estética y Valor):**
- 3.2 Teorías de la Estética y el Valor Artístico...
- 3.2.1 DEFINITIVO.md
- 3.2.1. El Juicio Estético, la Intencionalidad Artística y la Subjetividad.md
- 3.2.2. Presencia Escénica, Autenticidad y Expresividad Emocional en la Danza.md
- 3.2.3. La Recepción Estética y la Construcción de Significado.md

**Sección 3.3 (Poética de la Danza):**
- 3.3 La Poética de la Danza — Resistencias a la Automatización...
- 3.3.1. Elementos Constitutivos del Significado Dancístico.md
- 3.3.2. Improvisación y Composición como Prácticas Poéticas.md
- 3.3.3. El Anclaje Cultural e Histórico del Gesto Dancístico.md

**Síntesis:**
- 3.4 Sintesis Transversal-1.md
- 3.4 Sintesis Transversal-2.md

## Requisitos de Ejecución

### Fase 1: Síntesis y Planificación
1. Analiza TODOS los sources disponibles
2. Genera `sections/3-fundamentos-1/_section-outline.md` con:
   - Mapeo de cada source a las subsecciones correspondientes
   - Identificación de convergencias y tensiones entre sources
   - Propuesta de estructura narrativa coherente
   - Anchors propuestos para cada sección

### Fase 2: Redacción y Composición
1. Genera archivos de contenido en `sections/3-fundamentos-1/content/`:
   - Un archivo por subsección (e.g., `3.1.1-cuerpo-conocimiento.md`)
   - Formato APA 7 para todas las citas
   - Anchors en todos los encabezados según `rules/cross-references.md`
   - Referencias cruzadas donde corresponda

### Fase 3: Refinamiento y Evaluación
1. Aplica el sistema IRA para humanizar el texto
2. Genera reporte de evaluación en `sections/3-fundamentos-1/evaluation/`

## Especificaciones de Estilo

- **Idioma**: Español Peninsular
- **Citas**: APA 7ª edición
- **Registro**: Académico formal pero accesible
- **Persona**: Primera persona del plural para posicionamiento argumentativo
- **Hedging**: Uso natural de matización académica
- **Términos clave**: Mantener Leib y Körper en cursiva sin traducir

## Criterios de Calidad

El contenido generado debe:
1. **Avanzar la hipótesis central** de la tesis
2. **Sintetizar** (no solo reportar) los sources
3. **Integrar los tres pilares** tratados en este capítulo
4. **Establecer fundamentos** para el Capítulo 5 (el Marco "Resistencia Encarnada")
5. **Preparar conceptos** que se aplicarán en las viñetas del Capítulo 6

## Outputs Esperados

Al finalizar, debo tener:
- [ ] `_section-outline.md` en la raíz de la sección
- [ ] Archivos de contenido en `content/` (uno por subsección)
- [ ] `crossref-index.json` en `references/`
- [ ] Reporte de evaluación en `evaluation/`
- [ ] Lista de marcadores [NOTA:], [PENDIENTE:], [REVISAR:] para mi revisión

## Notas Adicionales

- Este capítulo NO debe incluir el pilar de Economía Laboral (ese es del Capítulo 4)
- La lente ético-política debe estar implícita en este capítulo, no explícita
- Asegúrate de que la Síntesis Intermedia (3.4) prepare el terreno para el Capítulo 4

Por favor, ejecuta el pipeline completo del sistema SRAMA y proporciona actualizaciones de progreso en cada fase.
```

---

## Checklist Pre-Ejecución

Antes de lanzar, verifica:

- [ ] Todos los archivos de contexto están incluidos
- [ ] La carpeta `sections/3-fundamentos-1/sources/` tiene los 17 archivos source
- [ ] Las carpetas `content/` y `evaluation/` existen en la sección
- [ ] Tienes acceso al sistema de agentes SRAMA

## Tiempo Estimado

- Fase 1 (Síntesis): ~5-10 minutos
- Fase 2 (Redacción): ~30-45 minutos (dependiendo de la extensión)
- Fase 3 (Refinamiento): ~15-20 minutos

Total estimado: 50-75 minutos para el capítulo completo
