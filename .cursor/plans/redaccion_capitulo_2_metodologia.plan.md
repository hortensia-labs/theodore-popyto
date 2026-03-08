---
name: ""
overview: ""
todos: []
isProject: false
---

# Plan de Redacción: Capítulo 2 — Metodología para la Construcción de un Marco Teórico Crítico

## Contexto

El Capítulo 2 es la **columna vertebral metodológica** de la tesis *Resistencia Encarnada*. Su propósito es doble: detallar de manera explícita y sistemática el proceso seguido para la construcción del marco teórico, y justificar por qué este método es el más adecuado para responder a la pregunta de investigación. La estructura está definida en `core/Indice de contenidos.md` (líneas 31-41) y el enfoque narrativo en `core/Desarrollo del Contenido.md` (líneas 58-93).

El capítulo tiene cinco secciones:

- **2.1** Enfoque General: Investigación Teórico-Conceptual y Constructivista
- **2.2** Fases de Desarrollo del Marco (RSL, Análisis Conceptual, Síntesis Interdisciplinaria)
- **2.3** El Modelo de Integración: Análisis Estratificado y Gestión de Tensiones Epistemológicas
- **2.4** Estrategia de Validación: Validación Teórica-Argumentativa mediante Viñetas Analíticas
- **2.5** Limitaciones Metodológicas del Estudio

## Particularidad del Capítulo 2

A diferencia de los capítulos 3-6, el Capítulo 2 tiene una posición **meta-reflexiva**: describe *cómo* se construyó la tesis, no *qué* se argumenta en ella. Esto crea oportunidades y desafíos específicos:

### Oportunidades

- Se escribe *a posteriori*: los capítulos 3-7 ya existen, por lo que puede describir el proceso tal como se realizó, con ejemplos concretos de cómo funcionó cada fase.
- Puede anticipar y vincular: cada decisión metodológica se conecta a su manifestación concreta en capítulos posteriores (e.g., "el análisis estratificado que aquí describimos se materializa en la arquitectura del Capítulo 5").
- Sirve como contrato con el lector: establece los criterios por los cuales la investigación debe ser juzgada.

### Desafíos

- **Necesita fuentes externas**: a diferencia del Cap. 7, este capítulo requiere bibliografía metodológica (constructivismo, PRISMA, métodos teóricos en humanidades, viñetas analíticas, síntesis interdisciplinaria).
- **Riesgo de prescriptividad excesiva**: el capítulo no debe leerse como un "manual de instrucciones" genérico, sino como la justificación de decisiones tomadas *para este problema específico*.
- **Equilibrio entre transparencia y concisión**: detallar lo suficiente para ser replicable sin convertirse en un protocolo operativo.

## Fuentes Externas Necesarias

Este capítulo SÍ requiere bibliografía académica externa. Las áreas clave son:

### 1. Investigación teórico-conceptual en ciencias humanas

- Jabareen, Y. (2009). Building a conceptual framework: philosophy, definitions, and procedure. *International Journal of Qualitative Methods*.
- Torraco, R. J. (2005). Writing integrative literature reviews: Guidelines and examples. *Human Resource Development Review*.
- Meredith, J. (1993). Theory building through conceptual methods. *International Journal of Operations & Production Management*.

### 2. Paradigma constructivista

- Guba, E. G. & Lincoln, Y. S. (1994). Competing paradigms in qualitative research. En *Handbook of Qualitative Research*.
- Crotty, M. (1998). *The Foundations of Social Research*.

### 3. Revisión sistemática de literatura (RSL)

- Moher, D. et al. (2009). Preferred Reporting Items for Systematic Reviews and Meta-Analyses: The PRISMA Statement.
- Snyder, H. (2019). Literature review as a research methodology: An overview and guidelines. *Journal of Business Research*.
- Grant, M. J. & Booth, A. (2009). A typology of reviews. *Health Information & Libraries Journal*.

### 4. Métodos interdisciplinarios

- Repko, A. F. & Szostak, R. (2020). *Interdisciplinary Research: Process and Theory*.
- Klein, J. T. (1990). *Interdisciplinarity: History, Theory, and Practice*.
- Barry, A., Born, G. & Weszkalnys, G. (2008). Logics of interdisciplinarity. *Economy and Society*.

### 5. Validación teórica y viñetas analíticas

- Lynham, S. A. (2002). The general method of theory-building research in applied disciplines. *Advances in Developing Human Resources*.
- Miles, M. B. & Huberman, A. M. (1994). *Qualitative Data Analysis* (sobre "thought experiments" y viñetas).
- Siggelkow, N. (2007). Persuasion with case studies. *Academy of Management Journal*.

### 6. Gestión de tensiones epistemológicas

- Sayer, A. (2000). *Realism and Social Science*.
- Alvesson, M. & Sköldberg, K. (2009). *Reflexive Methodology*.

**Estrategia para fuentes**: Dado que no existen documentos fuente preparados, se requiere una fase preliminar de investigación bibliográfica antes de la redacción. Se puede usar el SRAMA adaptado:

- **Fase 0** (nueva): Investigación y compilación de fuentes metodológicas
- **Fase 1**: Síntesis (outline basado en fuentes + capítulos existentes)
- **Fase 2**: Redacción sección por sección
- **Fase 3**: Refinamiento IRA + evaluación

## Arquitectura de Archivos a Generar

```
sections/2-metodologia/
  _section-outline.md           <-- Outline estructural
  content/
    2.1-enfoque-general.md      <-- Paradigma teórico-conceptual y constructivista
    2.2-fases-desarrollo.md     <-- Las 3 fases: RSL, análisis conceptual, síntesis
    2.3-modelo-integracion.md   <-- Análisis estratificado, gestión de tensiones
    2.4-validacion.md           <-- Viñetas analíticas como estrategia de validación
    2.5-limitaciones.md         <-- Limitaciones metodológicas
  sources/
    fuentes-metodologicas.md    <-- Compilación de fuentes externas investigadas
  references/
    crossref-index.json         <-- Índice de refs cruzadas
  evaluation/
    chapter-2-report.md         <-- Reporte de evaluación
```

El archivo placeholder `0-meto.md` se eliminará tras generar los archivos finales.

## Fase 0: Investigación de Fuentes (NUEVA — específica del Cap. 2)

### Paso 0.1 — Compilar fuentes metodológicas

A diferencia del Cap. 7, este capítulo necesita bibliografía externa. Se debe:

- Investigar fuentes sobre metodología de construcción teórica en humanidades y ciencias sociales
- Documentar el estándar PRISMA y sus adaptaciones para revisiones teóricas
- Recopilar literatura sobre investigación constructivista
- Compilar referencias sobre métodos interdisciplinarios y gestión de tensiones epistemológicas
- Buscar literatura sobre validación argumentativa mediante casos conceptuales / viñetas / thought experiments

Guardar en `sections/2-metodologia/sources/fuentes-metodologicas.md`.

### Paso 0.2 — Mapeo de lo que ya dice la tesis sobre metodología

La tesis ya contiene declaraciones metodológicas dispersas que el Cap. 2 debe sistematizar:

- `sections/1-introduccion/content/1.3-justificacion.md` — justifica el enfoque teórico-crítico
- `sections/1-introduccion/content/1.7-estructura.md` — describe el Cap. 2 anticipadamente
- `core/Base de la tesis.md` (sección 6) — describe el enfoque de "análisis estratificado"
- `sections/3-fundamentos-1/content/3.4-sintesis.md` — muestra el modelo de síntesis en acción
- `sections/4-fundamentos-2/content/4.3-sintesis-leib-tarea.md` — explicita la tensión Leib/tarea como ejemplo de gestión de tensiones
- `sections/5-marco-resistencia/content/5.1-arquitectura-marco.md` — la materialización del marco
- `sections/6-discusion/content/6.1.0-intro-vinetas.md` — implementa la metodología de viñetas
- `sections/6-discusion/content/6.3-autocritica.md` — reflexión sobre limitaciones

El Cap. 2 debe ser coherente con todas estas declaraciones. Es un capítulo que *explica y fundamenta* lo que los otros capítulos *hacen*.

## Fase 1: Síntesis y Planificación

### Paso 1.1 — Generar el Section Outline

Invocar el **synthesis-agent** con instrucciones para un capítulo metodológico. El agente debe:

- Leer la estructura planificada en `core/Indice de contenidos.md` (2.1-2.5) y `core/Desarrollo del Contenido.md` (descripción detallada de cada sección, líneas 58-93)
- Leer las declaraciones metodológicas dispersas en los capítulos existentes (listadas arriba)
- Integrar las fuentes externas compiladas en Fase 0
- Generar `_section-outline.md` con: propósito de cada sección, argumentos clave, fuentes (internas + externas), longitud estimada, anchors requeridos

**Directriz clave para el outline**: El capítulo debe tener un tono de **reflexividad metodológica**: no describe una receta genérica sino las decisiones tomadas para *este* problema específico. Cada sección debe vincular la decisión metodológica con la naturaleza del problema (interdisciplinario, emergente, ético-político).

### Paso 1.2 — Validación de Continuidad

Invocar el **continuity-agent** para verificar que el outline:

- Es coherente con lo prometido en `1.3-justificacion.md` y `1.7-estructura.md`
- Anticipa correctamente lo que ocurre en los Caps. 3-6
- No contradice declaraciones metodológicas ya presentes en el texto (especialmente en `Base de la tesis.md`)
- Los anchors generados son consistentes con los referenciados desde otros capítulos (e.g., `{#enfoque-metodologia}`, `{#metodologia-vinetas}`, `{#analisis-estratificado}`)

## Fase 2: Redacción

### Paso 2.1 — Contexto completo para el drafting-agent

El drafting-agent necesita recibir como contexto:

**Documentos fundacionales:**

- `core/Base de la tesis.md`
- `.claude/skills/academic-writing-style.md`
- El `_section-outline.md` validado
- `sections/2-metodologia/sources/fuentes-metodologicas.md`

**Inputs temáticos por sección:**

- **2.1**: `1.3-justificacion.md` (ya establece el enfoque), `Base de la tesis.md` (sección 6, metodología), literatura sobre constructivismo e investigación teórica
- **2.2**: Los capítulos 3 y 4 como ejemplos de las fases en acción (RSL → análisis → síntesis), literatura sobre PRISMA adaptado, análisis conceptual crítico
- **2.3**: `Base de la tesis.md` (análisis estratificado), `4.3-sintesis-leib-tarea.md` (ejemplo de tensión productiva), `5.1-arquitectura-marco.md` (ejemplo de integración lograda), literatura sobre interdisciplinariedad
- **2.4**: `6.1.0-intro-vinetas.md` (la implementación de la estrategia), `6.1.4-sintesis-vinetas.md` (los resultados), literatura sobre validación teórica y poder heurístico
- **2.5**: `6.3-autocritica.md` (limitaciones reconocidas), reflexión sobre posicionalidad del investigador

### Paso 2.2 — Redacción sección por sección

Redactar en orden secuencial 2.1 → 2.2 → 2.3 → 2.4 → 2.5. Cada archivo se genera como un .md independiente en `content/`.

**Directrices específicas por sección:**

- **2.1 Enfoque General** (~600-800 palabras): Definir el paradigma teórico-conceptual y constructivista. Explicar POR QUÉ este enfoque es el más adecuado para *esta* pregunta de investigación (no genéricamente). Vincular con lo ya argumentado en 1.3 sin repetirlo. Distinguir entre investigación teórica e investigación empírica, y entre constructivismo y positivismo. Tono: reflexivo, fundamentado. Citaciones metodológicas necesarias.
- **2.2 Fases de Desarrollo** (~1000-1200 palabras): Las 3 fases (RSL, análisis conceptual, síntesis interdisciplinaria). Para cada fase: qué se hizo, cómo se hizo, por qué se hizo así. La Fase 1 (RSL) requiere descripción del protocolo PRISMA adaptado: bases de datos, criterios de inclusión/exclusión, cadenas de búsqueda. La Fase 2 (análisis conceptual) debe describir la "lectura analítica profunda" y la extracción de conceptos. La Fase 3 (síntesis) debe describir cómo se pasó de los conceptos extraídos a la arquitectura integrada del Cap. 5. Incluir una FIGURA o TABLA del proceso de fases. Nota: las fases se presentan linealmente pero son iterativas — señalarlo explícitamente. Tono: descriptivo-procedimental pero no mecánico.
- **2.3 Modelo de Integración** (~800-1000 palabras): ESTA ES LA SECCIÓN MÁS IMPORTANTE — describe la innovación metodológica de la tesis. El "análisis estratificado" es el método que permite integrar perspectivas epistemológicamente diversas sin reducir unas a otras. Explicar: (1) qué es el análisis estratificado (cada perspectiva ocupa un nivel), (2) por qué las tensiones son productivas (no contradicciones a resolver), (3) cómo se gestionan concretamente (ejemplos de la tesis: fenomenología ↔ economía laboral), (4) el papel de la lente ético-política como salvaguarda reflexiva. Referenciar los precedentes en la literatura interdisciplinaria. Tono: conceptualmente denso pero claro.
- **2.4 Estrategia de Validación** (~600-800 palabras): Explicar POR QUÉ la validación de un marco teórico no es empírica sino argumentativa. Definir el "poder heurístico" como criterio de validez. Describir la estrategia de viñetas analíticas: qué son, cómo se seleccionan los casos (criterios), cómo se aplica el marco (procedimiento), cómo se evalúan los resultados (diferenciación, revelación, orientación). NO anticipar los resultados de las viñetas (eso es Cap. 6); sí establecer los criterios por los cuales se evaluará si la validación fue exitosa. Vincular con `6.1.0-intro-vinetas.md` mediante anchors. Tono: argumentativo, anticipatorio.
- **2.5 Limitaciones Metodológicas** (~400-600 palabras): Reconocimiento honesto de las limitaciones del enfoque teórico. (1) Las conclusiones son hipótesis fundamentadas, no hallazgos empíricamente verificados. (2) La selección de fuentes y su interpretación refleja la posicionalidad del investigador. (3) El foco en tradiciones occidentales (adelanto de lo que se reconoce en 6.3). (4) Las viñetas son ejercicios argumentativos, no evidencia empírica. (5) El dinamismo tecnológico implica que el análisis de capacidades de la IA puede quedar desactualizado. Para cada limitación, señalar la estrategia de mitigación adoptada. Tono: honesto, matizado.

**Longitud total estimada**: 3400-4400 palabras.

### Paso 2.3 — Referencias Cruzadas

Invocar el **crossref-agent** para validar que todos los anchors usados en el capítulo 2 apunten a destinos válidos. Generar `crossref-index.json`.

**Anchors que deben CREARSE en el Cap. 2** (referenciados desde otros capítulos):

- `{#enfoque-metodologia}` — referenciado desde 1.3 y 1.7
- `{#metodologia-vinetas}` o `{#validacion-vinetas}` — referenciado desde 6.1.0 y el outline del Cap. 6
- `{#analisis-estratificado}` — concepto central, referenciado desde múltiples capítulos
- `{#fases-desarrollo}` — referenciado implícitamente desde 1.7

**Anchors a los que APUNTARÁ el Cap. 2** (en otros capítulos):

- `{#justificacion-enfoque}` (1.3)
- `{#objetivos}` (1.5)
- `{#pregunta-hipotesis}` (1.4)
- `{#sintesis-cap3}` (3.4)
- `{#sintesis-leib-tarea}` (4.3)
- `{#arquitectura-marco}` (5.1)
- `{#validacion-vinetas}` (6.1)
- `{#autocritica}` (6.3)

## Fase 3: Refinamiento y Evaluación

### Paso 3.1 — Sistema IRA

Aplicar el pipeline IRA a los 5 archivos de content/:

1. **diagnostic_agent**: Detectar patrones de IA
2. **architect_agent**: Reestructurar para variación rítmica y fluidez natural
3. **voice_agent**: Humanizar el vocabulario, añadir matización académica auténtica
4. **verification_agent**: Verificar que el texto pasaría detección de IA

### Paso 3.2 — Evaluación Académica

Invocar el **evaluation-agent** para evaluar:

- Coherencia con las promesas hechas en Cap. 1 (especialmente 1.3 y 1.7)
- Correspondencia entre la metodología descrita y lo que efectivamente se hizo en Caps. 3-6
- Rigor y especificidad del protocolo de RSL
- Claridad del modelo de análisis estratificado
- Solidez de la justificación de viñetas analíticas como estrategia de validación
- Honestidad y completitud de las limitaciones
- Calidad de las citas externas

### Paso 3.3 — Limpieza

- Eliminar `content/0-meto.md` (placeholder)
- Resolver cualquier marcador `[NOTA:]`, `[PENDIENTE:]`, `[REVISAR:]`
- Verificar con `make validate-section 2-metodologia`
- Verificar que los anchors creados son consistentes con los referenciados desde otros capítulos

## Diferenciación Crítica: Cap. 2 vs. otras secciones metodológicas

Para evitar redundancia con otras secciones de la tesis que tocan metodología:

- **1.3 (Justificación)** JUSTIFICA el enfoque teórico-crítico (por qué, no cómo) → **2.1** DEFINE el paradigma y **2.2** DETALLA el procedimiento
- **6.1.0 (Intro viñetas)** IMPLEMENTA las viñetas → **2.4** ESTABLECE los criterios por los cuales se juzgará la validación (antes de mostrar resultados)
- **6.3 (Autocrítica)** RECONOCE limitaciones del marco teórico → **2.5** RECONOCE limitaciones del enfoque metodológico (distinción sutil pero importante)
- **Base de la tesis (sección 6)** ESBOZA la metodología → **2.2-2.3** la DESARROLLAN en detalle

## Riesgos y Mitigaciones

- **Riesgo de generalismo**: Describir un método genérico de "investigación teórica" sin anclaje en *este* problema. **Mitigación**: Cada decisión metodológica debe vincularse explícitamente a una característica del problema (interdisciplinariedad, emergencia del fenómeno, carga ético-política).
- **Riesgo de prescriptividad**: Sonar como un manual de métodos que aplica a cualquier tesis. **Mitigación**: El tono debe ser reflexivo ("elegimos... porque..."), no prescriptivo ("se debe...").
- **Riesgo de inconsistencia retrospectiva**: Describir un método idealizado que no corresponde a lo que realmente se hizo. **Mitigación**: El capítulo se escribe DESPUÉS de los Caps. 3-6, así que puede describir fielmente el proceso, incluyendo su carácter iterativo.
- **Riesgo de falta de citas**: Un capítulo metodológico sin bibliografía específica carece de rigor. **Mitigación**: La Fase 0 asegura una base bibliográfica mínima antes de la redacción.
- **Vocabulario AI detectable**: Mitigación via pipeline IRA completo.

## Secuencia de Ejecución Recomendada

```
Fase 0: Investigación de fuentes (~30 min)
  0.1  Compilar fuentes metodológicas externas
  0.2  Mapear declaraciones metodológicas internas

Fase 1: Síntesis y Planificación (~20 min)
  1.1  Generar _section-outline.md
  1.2  Validar con continuity-agent

Fase 2: Redacción (~45 min)
  2.1  Redactar 2.1-enfoque-general.md
  2.2  Redactar 2.2-fases-desarrollo.md
  2.3  Redactar 2.3-modelo-integracion.md
  2.4  Redactar 2.4-validacion.md
  2.5  Redactar 2.5-limitaciones.md
  2.6  Validar referencias cruzadas

Fase 3: Refinamiento (~30 min)
  3.1  Pipeline IRA (diagnóstico + revisión)
  3.2  Evaluación académica
  3.3  Limpieza y validación final
```

