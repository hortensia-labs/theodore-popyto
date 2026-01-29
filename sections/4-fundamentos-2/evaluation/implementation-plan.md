# Plan de Implementación: Recomendaciones de Continuidad Capítulos 3-4

## Contexto

Este plan detalla las acciones necesarias para implementar las recomendaciones del `continuity-report.md` antes de iniciar la redacción del Capítulo 5. Cada tarea está diseñada para ser ejecutada de forma autónoma por un agente.

---

## FASE 1: ALTA PRIORIDAD (Crítico antes de Capítulo 5)

### Tarea 1.1: Resolver marcadores PENDIENTE en Capítulo 4

**Objetivo**: Reemplazar todos los marcadores `[PENDIENTE: ref Cap 3...]` con referencias cruzadas funcionales.

**Archivos a modificar**:
- `sections/4-fundamentos-2/content/4.1.1-tareas-rutinarias.md`
- `sections/4-fundamentos-2/content/4.1.2-desagregacion-danza.md`
- `sections/4-fundamentos-2/content/4.2.2-brecha-comprension.md`
- `sections/4-fundamentos-2/content/4.3-sintesis-leib-tarea.md`

**Instrucciones específicas**:

1. **En 4.1.1-tareas-rutinarias.md** (aprox. línea 19):
   - Buscar: `[PENDIENTE: ref Cap 3 - definición Leib]`
   - Reemplazar con: `[Paragraph Number & Page Number](#korper-leib)`
   - Contexto: Aparece tras mencionar "*Leib* o cuerpo-vivido"

2. **En 4.1.2-desagregacion-danza.md**:
   - Línea ~31: Buscar `[PENDIENTE: ref Cap 3 - inteligencia kinestésica]`
     - Reemplazar con: `[Paragraph Number & Page Number](#inteligencia-kinestetica)`
   - Línea ~51: Buscar `[PENDIENTE: ref Cap 3 - cognición corporeizada]`
     - Reemplazar con: `[Paragraph Number & Page Number](#cognicion-corporeizada)`
   - Línea ~57: Buscar `[PENDIENTE: ref Cap 3 - presencia escénica]`
     - Reemplazar con: `[Paragraph Number & Page Number](#presencia-escenica)`

3. **En 4.2.2-brecha-comprension.md**:
   - Línea ~13: Buscar `[PENDIENTE: ref Cap 3 - inteligencia kinestésica]`
     - Reemplazar con: `[Paragraph Number & Page Number](#inteligencia-kinestetica)`
   - Línea ~17: Buscar `[PENDIENTE: ref Cap 3 - distinción Körper/Leib]`
     - Reemplazar con: `[Paragraph Number & Page Number](#korper-leib)`

4. **En 4.3-sintesis-leib-tarea.md**:
   - Línea ~15: Buscar `[PENDIENTE: ref Cap 3 - sección sobre Leib/Körper]`
     - Reemplazar con: `[Paragraph Number & Page Number](#korper-leib)`
   - Línea ~22: Buscar `[PENDIENTE: ref Cap 3 - definición Leib]`
     - Reemplazar con: `[Paragraph Number & Page Number](#cuerpo-vivido)`
   - Línea ~58: Buscar `[PENDIENTE: ref Cap 3]`
     - Reemplazar con: `[Paragraph Number & Page Number](#sintesis-cap3)`
   - Línea ~63: Mantener `[PENDIENTE: ref Cap 5]` (se resolverá cuando exista Cap 5)

**Verificación**: Ejecutar búsqueda de `PENDIENTE: ref Cap 3` en el directorio `sections/4-fundamentos-2/content/` — debe retornar 0 resultados (excepto la referencia a Cap 5).

---

### Tarea 1.2: Crear introducción del Capítulo 4

**Objetivo**: Crear `4.0-introduccion.md` para paridad estructural con Capítulo 3.

**Archivo a crear**: `sections/4-fundamentos-2/content/4.0-introduccion.md`

**Estructura requerida** (modelada en 3.0-introduccion.md):

```markdown
# Capítulo 4: Fundamentos Teóricos II — El Contexto Tecno-Económico de la Automatización {#cap4-introduccion}

[Párrafo 1: Transición desde Capítulo 3]
- Retomar la conclusión del Capítulo 3 sobre la singularidad de la práctica dancística
- Establecer que este capítulo complementa la perspectiva fenomenológica con una mirada económica y tecnológica

[Párrafo 2: Presentación del pilar de Economía Laboral]
- Introducir el enfoque basado en tareas (task-based approach)
- Explicar su utilidad para el análisis del trabajo creativo
- Establecer la salvaguarda metodológica: la "tarea" como abstracción analítica, siempre ejecutada por un cuerpo-vivido

[Párrafo 3: Estructura del capítulo con referencias cruzadas]
- Sección 4.1: Pilar de la Economía Laboral [Paragraph Number & Page Number](#tareas-rutinarias-no-rutinarias)
- Sección 4.2: La IA Generativa: Capacidades y Límites [Paragraph Number & Page Number](#modelos-iag-actuales)
- Sección 4.3: Síntesis Intermedia II [Paragraph Number & Page Number](#sintesis-leib-tarea)

[Párrafo 4: Conexión con el marco general]
- Mencionar que la lente ético-política permanece implícita (se desarrollará en Cap 5)
- Anticipar la "tensión productiva" entre Leib y tarea como hilo conductor

[Nota final opcional]
[NOTA: Verificar referencias cruzadas tras compilación final]
```

**Longitud objetivo**: 400-600 palabras (similar a 3.0-introduccion.md).

**Estilo**: Seguir las convenciones de `.claude/skills/academic-writing-style.md`.

---

### Tarea 1.3: Añadir referencias adelantadas en síntesis del Capítulo 3

**Objetivo**: Insertar referencias cruzadas explícitas hacia el Capítulo 4 en la síntesis 3.4.

**Archivo a modificar**: `sections/3-fundamentos-1/content/3.4-sintesis.md`

**Ubicación**: En la sección "Preparación para el Capítulo 4" (líneas finales del archivo).

**Instrucciones**:

1. Localizar el párrafo que dice:
   ```
   Los fundamentos establecidos en este capítulo preparan el análisis del pilar de la economía laboral que se desarrollará en el Capítulo 4.
   ```

2. Modificar para incluir referencias cruzadas:
   ```markdown
   Los fundamentos establecidos en este capítulo preparan el análisis del **pilar de la economía laboral** que se desarrollará en el Capítulo 4. La distinción entre *Körper* y *Leib* resultará fundamental para comprender por qué el análisis de tareas tradicional —que opera sobre cuerpos-objeto— resulta insuficiente para capturar la complejidad del trabajo dancístico [Paragraph Number & Page Number](#tareas-rutinarias-no-rutinarias). El conocimiento tácito kinestésico establecerá las bases para argumentar que ciertas formas de saber profesional en la danza resisten la descomposición en tareas discretas [Paragraph Number & Page Number](#desagregacion-profesiones-danza).
   ```

3. En el párrafo final, añadir referencia a la síntesis de Cap 4:
   ```markdown
   El Capítulo 4 examinará cómo esta resistencia encarnada se manifiesta en el contexto específico del trabajo creativo, analizando qué tareas de la práctica dancística son susceptibles de automatización y cuáles permanecen irreductiblemente humanas. La tensión productiva entre el *Leib* fenomenológico y la "tarea" como unidad de análisis económico constituirá el núcleo de esa exploración [Paragraph Number & Page Number](#sintesis-leib-tarea).
   ```

---

## FASE 2: PRIORIDAD MEDIA (Mejoras de calidad)

### Tarea 2.1: Añadir principio "Codificable ≠ Sin Valor" en síntesis 4.3

**Objetivo**: Hacer explícito un principio que actualmente está implícito.

**Archivo a modificar**: `sections/4-fundamentos-2/content/4.3-sintesis-leib-tarea.md`

**Ubicación sugerida**: En la sección "La resistencia encarnada: más allá del determinismo tecnológico", después del párrafo sobre el "excepcionalismo artístico ingenuo".

**Texto a insertar**:

```markdown
Una salvaguarda conceptual resulta imprescindible: **la susceptibilidad a la automatización de una tarea no tiene correlación con su valor artístico, social o cultural**. Este principio —que podemos denominar "codificable no equivale a sin valor"— constituye una protección contra jerarquizaciones implícitas que podrían devaluar formas de danza más técnicas, comerciales o tradicionales al clasificarlas como "rutinarias" o "automatizables". El marco de Resistencia Encarnada debe afirmar explícitamente que el valor de la práctica dancística no se deriva de su resistencia a la automatización, sino de su capacidad para generar experiencia significativa, comunidad cultural y expresión humana —dimensiones que existen independientemente de cualquier frontera tecnológica.
```

---

### Tarea 2.2: Fortalecer preview de análisis Cui Bono en 4.3

**Objetivo**: Preparar explícitamente el terreno para el análisis de poder del Capítulo 5.

**Archivo a modificar**: `sections/4-fundamentos-2/content/4.3-sintesis-leib-tarea.md`

**Ubicación sugerida**: En la sección final "Hacia el Capítulo 5", antes del ítem 4 sobre la lente ético-política.

**Texto a insertar** (modificar el ítem 4 existente):

```markdown
4. **La lente ético-política** [PENDIENTE: ref Cap 5]: Las distinciones que trazamos (automatizable/irreductible, aumentable/intocable) son construcciones sociales con implicaciones de poder que deben ser sometidas a escrutinio crítico. La pregunta central no es solamente *qué* puede automatizarse, sino *quién* traza la frontera, *con qué herramientas* y *para qué fines*. El análisis de poder —*cui bono*— que desarrollará el Capítulo 5 debe evaluar explícitamente quién se beneficia y quién podría ser devaluado por estas distinciones: ¿favorecen a las élites artísticas sobre los artistas comerciales? ¿Privilegian formas de danza canónicas sobre tradiciones no occidentales? ¿Jerarquizan la "creatividad" sobre el "oficio técnico"?
```

---

### Tarea 2.3: Inventario y clasificación de marcadores NOTA/REVISAR

**Objetivo**: Documentar todos los marcadores pendientes para seguimiento futuro.

**Acción**: Crear archivo de inventario.

**Archivo a crear**: `sections/4-fundamentos-2/evaluation/pending-markers-inventory.md`

**Contenido a generar** (búsqueda en ambos capítulos):

```markdown
# Inventario de Marcadores Pendientes

## Capítulo 3

### Marcadores [NOTA]
| Archivo | Línea aprox. | Contenido | Prioridad |
|---------|--------------|-----------|-----------|
| 3.0-introduccion.md | final | Verificar referencias cruzadas tras compilación | Baja |
| 3.1.1-cuerpo-conocimiento.md | 45 | Revisar citas Prescott y Wilson según APA 7 | Media |
| 3.1.2-conocimiento-tacito.md | 55 | Verificar cita "Unknown Author, 2024" | Alta |
| 3.1.3-presencia-escenica.md | 39 | Anclar sección con #interocepcion | Baja |
| 3.3.1-lenguaje-movimiento.md | 61 | Conectar con sección 3.3.3 | Media |

### Marcadores [REVISAR]
| Archivo | Línea aprox. | Contenido | Decisión requerida |
|---------|--------------|-----------|-------------------|
| 3.1.3-presencia-escenica.md | 65 | Solapamiento con 3.2.3 presencia aurática | Autor |
| 3.2.3-finitud.md | 55 | Conectar conclusión con síntesis 3.4 | Agente |

### Marcadores [PENDIENTE]
| Archivo | Línea aprox. | Contenido | Estado |
|---------|--------------|-----------|--------|
| 3.2.2-co-construccion.md | 71 | Añadir ejemplo estudio experimental | Pendiente |
| 3.3.2-improvisacion.md | 63 | Añadir referencia caso de estudio | Pendiente |

## Capítulo 4

### Marcadores [NOTA]
| Archivo | Línea aprox. | Contenido | Prioridad |
|---------|--------------|-----------|-----------|
| 4.1.1-tareas-rutinarias.md | 35 | Establece marco teórico general | Info |
| 4.1.2-desagregacion-danza.md | 63 | Diagrama visual matriz tareas | Baja |
| 4.1.3-aumento-complementariedad.md | 51 | Tabla comparativa herramientas IA | Media |
| 4.2.1-modelos-iag-actuales.md | 57 | Verificar referencias 2023-2025 | Media |
| 4.2.2-brecha-comprension.md | 67 | Verificar transiciones perspectivas | Media |
| 4.3-sintesis-leib-tarea.md | 71 | Verificar conexiones Cap 3 | Media |

### Marcadores [PENDIENTE] (Cap 5)
| Archivo | Línea aprox. | Contenido | Estado |
|---------|--------------|-----------|--------|
| 4.3-sintesis-leib-tarea.md | 63 | ref Cap 5 | Esperar Cap 5 |
| 4.2.2-brecha-comprension.md | 69 | ref Cap 5 implicaciones | Esperar Cap 5 |
```

---

## FASE 3: PRIORIDAD BAJA (Mejoras opcionales)

### Tarea 3.1: Añadir anchor #interocepcion

**Archivo**: `sections/3-fundamentos-1/content/3.1.3-presencia-escenica.md`

**Acción**: Localizar la sección sobre interocepción (aprox. línea 37-44) y añadir anchor adicional.

**Instrucción**: Modificar el encabezado o añadir anchor inline:

```markdown
#### Propiocepción e interocepción: las bases de la conciencia corporal {#propiocepcion} {#interocepcion}
```

O alternativamente, usar span con id:

```markdown
#### Propiocepción e interocepción: las bases de la conciencia corporal {#propiocepcion}

<span id="interocepcion"></span>La interocepción, definida como...
```

---

### Tarea 3.2: Verificar conexión 3.2.3 → 3.4

**Archivo**: `sections/3-fundamentos-1/content/3.2.3-finitud.md`

**Acción**: Verificar que el párrafo final conecte explícitamente con la síntesis.

**Instrucción**: El marcador `[REVISAR: Asegurar que la conclusión conecte explícitamente con la síntesis del capítulo 3.4]` indica que debe verificarse la transición.

Verificar que exista una frase como:
```markdown
Las implicaciones aquí desarrolladas sobre el valor de la finitud, la fragilidad y la efimeridad serán integradas en la síntesis del capítulo [Paragraph Number & Page Number](#sintesis-cap3), donde articularemos el núcleo de lo irreductiblemente humano en la danza.
```

---

## Orden de Ejecución Recomendado

```
FASE 1 (Secuencial - dependencias)
├── 1.1 Resolver PENDIENTE markers
├── 1.2 Crear 4.0-introduccion.md
└── 1.3 Añadir referencias en 3.4

FASE 2 (Paralelo - independientes)
├── 2.1 Añadir principio Codificable≠SinValor
├── 2.2 Fortalecer Cui Bono
└── 2.3 Crear inventario markers

FASE 3 (Paralelo - opcionales)
├── 3.1 Anchor interocepcion
└── 3.2 Verificar conexión 3.2.3→3.4
```

---

## Verificación Final

Tras completar todas las tareas, ejecutar:

1. **Búsqueda de PENDIENTE Cap 3**: 
   ```bash
   grep -r "PENDIENTE: ref Cap 3" sections/4-fundamentos-2/content/
   ```
   Resultado esperado: 0 coincidencias

2. **Verificar existencia de 4.0**:
   ```bash
   ls sections/4-fundamentos-2/content/4.0-introduccion.md
   ```
   Resultado esperado: archivo existe

3. **Verificar referencias en 3.4**:
   ```bash
   grep -c "#tareas-rutinarias" sections/3-fundamentos-1/content/3.4-sintesis.md
   ```
   Resultado esperado: ≥1

4. **Verificar principio Codificable**:
   ```bash
   grep -c "codificable" sections/4-fundamentos-2/content/4.3-sintesis-leib-tarea.md
   ```
   Resultado esperado: ≥1

---

*Plan generado: 2026-01-29*
*Estimación de ejecución: 30-45 minutos para agente automatizado*
