# Prompt de Orquestación SRAMA: Capítulo 4 - Fundamentos Teóricos II

## Instrucciones de Uso

### Archivos a incluir como contexto (@)

Antes de enviar este prompt, asegúrate de incluir los siguientes archivos como contexto:

**Obligatorios:**
- `@core/Base de la tesis.md`
- `@core/Indice de contenidos.md`
- `@.claude/skills/academic-writing-style.md`
- `@.claude/agents/srama-orchestrator.md`
- `@rules/cross-references.md`

**Sources del Capítulo 4** (todos):
- `@sections/4-fundamentos-2/sources/`

**Opcional pero recomendado:**
- `@.claude/agents/synthesis-agent.md`
- `@.claude/agents/continuity-agent.md`
- `@.claude/agents/drafting-agent.md`

---

## Prompt

```
Ejecuta el sistema SRAMA (Sistema de Redacción Académica Multi-Agente) para generar el contenido completo del Capítulo 4: "Fundamentos Teóricos II: El Contexto Tecno-Económico de la Automatización" de mi tesis doctoral.

## Contexto de la Tesis

**Título**: "Resistencia Encarnada: Hacia un Marco Teórico Interdisciplinario para el Análisis Crítico y la Co-Creación en la Danza ante la Inteligencia Artificial"

**Hipótesis Central**: La construcción de un marco teórico interdisciplinario que integre la cognición corporeizada, la economía laboral, la estética del valor y la poética de la danza —atravesado por una lente ético-política— permitirá no solo identificar los mecanismos de resistencia a la automatización, sino también modelar posibilidades de co-creación.

## Estructura del Capítulo 4

Según el índice de contenidos, este capítulo debe cubrir:

### 4.1. Pilar de la Economía Laboral (Enfoque Basado en Tareas)
- 4.1.1. Tareas Rutinarias vs. No Rutinarias en el Trabajo Creativo
- 4.1.2. La Desagregación de las Profesiones de Danza
- 4.1.3. Potencialidades de Aumento y Complementariedad Tecnológica

### 4.2. La Inteligencia Artificial Generativa: Capacidades, Límites y Trayectorias
- 4.2.1. Modelos Actuales y su Aplicación en Dominios Creativos
- 4.2.2. La Brecha entre Procesamiento de Datos y Comprensión del Mundo

### 4.3. Síntesis Intermedia II
- La Tensión Productiva entre el Leib y la "Tarea"

## Sources Disponibles

Los materiales de investigación están en `sections/4-fundamentos-2/sources/` e incluyen:

- `4-1-la-danza-profesional.md` - Análisis del trabajo profesional en danza
- `4-2-la-iag-en-las-artes-del-mov.md` - IA generativa en las artes del movimiento
- `4-3-valoracion-del-trabajo.md` - Valoración del trabajo creativo
- `4-4-implicaciones-legales-y-eticas.md` - Implicaciones legales y éticas

## Requisitos de Ejecución

### Fase 1: Síntesis y Planificación
1. Analiza TODOS los sources disponibles
2. Genera `sections/4-fundamentos-2/_section-outline.md` con:
   - Mapeo de cada source a las subsecciones correspondientes
   - Identificación de convergencias y tensiones entre sources
   - Propuesta de estructura narrativa coherente
   - Anchors propuestos para cada sección
   - IMPORTANTE: Identifica posibles vacíos de contenido dado que hay menos sources que para el Capítulo 3

### Fase 2: Redacción y Composición
1. Genera archivos de contenido en `sections/4-fundamentos-2/content/`:
   - Un archivo por subsección (e.g., `4.1.1-tareas-rutinarias.md`)
   - Formato APA 7 para todas las citas
   - Anchors en todos los encabezados según `rules/cross-references.md`
   - Referencias cruzadas donde corresponda

### Fase 3: Refinamiento y Evaluación
1. Aplica el sistema IRA para humanizar el texto
2. Genera reporte de evaluación en `sections/4-fundamentos-2/evaluation/`

## Especificaciones de Estilo

- **Idioma**: Español Peninsular
- **Citas**: APA 7ª edición
- **Registro**: Académico formal pero accesible
- **Persona**: Primera persona del plural para posicionamiento argumentativo
- **Hedging**: Uso natural de matización académica
- **Términos clave**: 
  - Mantener Leib y Körper en cursiva sin traducir (cuando se referencien)
  - "Tarea" en el sentido de task-based approach de economía laboral
  - IA/Inteligencia Artificial con mayúsculas iniciales

## Relación con Capítulo 3

Este capítulo se ejecuta en PARALELO con el Capítulo 3, pero debe:
1. **Complementar** los fundamentos del Capítulo 3 (no repetirlos)
2. **Preparar referencias cruzadas** hacia conceptos que se definen en el Capítulo 3:
   - Usar marcadores [PENDIENTE: ref Cap 3 - concepto X] cuando necesites referenciar
   - El Leib/Körper se define en 3.1, aquí solo se aplica
3. **Establecer el polo "económico-tecnológico"** de la tensión con el polo "fenomenológico-corporal"

## Criterios de Calidad

El contenido generado debe:
1. **Avanzar la hipótesis central** de la tesis desde la perspectiva económica-tecnológica
2. **Sintetizar** (no solo reportar) los sources
3. **Subordinar el análisis de tareas** a la perspectiva fenomenológica (según la Base de la Tesis: una "tarea" es siempre ejecutada por un cuerpo-vivido)
4. **Problematizar** la visión determinista de la automatización
5. **Establecer fundamentos** para la Síntesis del Capítulo 5

## Salvaguarda Metodológica Clave

IMPORTANTE: Según la Base de la Tesis, este capítulo debe incluir una salvaguarda metodológica crítica:

> "Dentro de este marco, una 'tarea' nunca es una entidad mecánica. Es una abstracción de un patrón de acción que es siempre, y en última instancia, ejecutado por un cuerpo-vivido."

Esta subordinación de la perspectiva económica a la fenomenológica debe estar explícita en el capítulo.

## Outputs Esperados

Al finalizar, debo tener:
- [ ] `_section-outline.md` en la raíz de la sección
- [ ] Archivos de contenido en `content/` (uno por subsección)
- [ ] `crossref-index.json` en `references/`
- [ ] Reporte de evaluación en `evaluation/`
- [ ] Lista de marcadores [NOTA:], [PENDIENTE:], [REVISAR:] para mi revisión
- [ ] Lista de referencias cruzadas pendientes hacia Capítulo 3

## Notas Adicionales

- Este capítulo tiene MENOS sources que el Capítulo 3 (4 vs 17)
- Si detectas vacíos de contenido, marca con [NOTA: Posible necesidad de investigación adicional sobre...]
- La sección 4.2 sobre IA debe ser actual y rigurosa - si los sources no cubren desarrollos recientes, señálalo
- La lente ético-política debe estar implícita en este capítulo, preparando su tratamiento explícito en el Capítulo 5

Por favor, ejecuta el pipeline completo del sistema SRAMA y proporciona actualizaciones de progreso en cada fase.
```

---

## Checklist Pre-Ejecución

Antes de lanzar, verifica:

- [ ] Todos los archivos de contexto están incluidos
- [ ] La carpeta `sections/4-fundamentos-2/sources/` tiene los 4 archivos source
- [ ] Las carpetas `content/` y `evaluation/` existen en la sección
- [ ] Tienes acceso al sistema de agentes SRAMA

## Nota sobre Sources Limitados

El Capítulo 4 tiene significativamente menos sources (4) que el Capítulo 3 (17). Esto puede resultar en:

1. **Secciones más breves** - lo cual puede ser apropiado si el contenido es denso
2. **Marcadores [NOTA:]** - indicando donde se necesita más investigación
3. **Mayor síntesis requerida** - los 4 sources deben distribuirse eficientemente

Si durante la ejecución el sistema detecta vacíos importantes, considera:
- Pausar la redacción
- Generar sources adicionales para las áreas identificadas
- Reiniciar el pipeline con el material expandido

## Tiempo Estimado

- Fase 1 (Síntesis): ~3-5 minutos
- Fase 2 (Redacción): ~20-30 minutos
- Fase 3 (Refinamiento): ~10-15 minutos

Total estimado: 35-50 minutos para el capítulo completo

(Menor tiempo que Cap. 3 debido a menos sources)
