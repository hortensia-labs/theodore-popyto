# Prompt de Orquestación SRAMA: Capítulo 6 - Discusión: Aplicación Heurística y Crítica del Marco

## ⚠️ PRERREQUISITOS CRÍTICOS

Antes de ejecutar este prompt, verifica que:

### 1. Capítulos 3, 4 y 5 están COMPLETOS y VALIDADOS

- [ ] `sections/3-fundamentos-1/content/` contiene todos los archivos finales
- [ ] `sections/4-fundamentos-2/content/` contiene todos los archivos finales
- [ ] `sections/5-marco-resistencia/content/` contiene todos los archivos finales
- [ ] Revisión de los tres capítulos APROBADA (ver `sections/5-marco-resistencia/evaluation/revision_report-3-4-5.md`)

### 2. Sources del Capítulo 6 están GENERADOS

**IMPORTANTE**: El Capítulo 6 requiere investigación específica para las tres viñetas analíticas. Estos sources deben generarse ANTES de ejecutar SRAMA:

- [ ] `vineta-A-ballet-pedagogia.md` ← Generar con `DR_Cap6_Vineta_A_Ballet_Pedagogia.md`
- [ ] `vineta-B-coreografia-aumentada.md` ← Generar con `DR_Cap6_Vineta_B_Coreografia_Aumentada.md`
- [ ] `vineta-C-ejecutante-posthumano.md` ← Generar con `DR_Cap6_Vineta_C_Ejecutante_Posthumano.md`

Todos estos archivos deben estar en `sections/6-discusion/sources/`

### 3. Estructura de Directorios Lista

- [ ] `sections/6-discusion/content/` existe
- [ ] `sections/6-discusion/evaluation/` existe
- [ ] `sections/6-discusion/references/` existe

---

## Instrucciones de Uso

### Archivos a incluir como contexto (@)

**Documentos Fundacionales (OBLIGATORIOS):**

```
@core/Base de la tesis.md
@core/Indice de contenidos.md
@.claude/skills/academic-writing-style.md
@.claude/agents/srama-orchestrator.md
@rules/cross-references.md
```

**Contenido de Capítulos Previos (CRÍTICO - El marco debe aplicarse):**

```
@sections/3-fundamentos-1/content/
@sections/4-fundamentos-2/content/
@sections/5-marco-resistencia/content/
```

**Sources Específicos del Capítulo 6:**

```
@sections/6-discusion/sources/
```

**Reporte de Revisión (referencia):**

```
@sections/5-marco-resistencia/evaluation/revision_report-3-4-5.md
```

---

## Prompt

```
Ejecuta el sistema SRAMA (Sistema de Redacción Académica Multi-Agente) para generar el contenido completo del Capítulo 6: "Discusión: Aplicación Heurística y Crítica del Marco" de mi tesis doctoral.

## Contexto de la Tesis

**Título**: "Resistencia Encarnada: Hacia un Marco Teórico Interdisciplinario para el Análisis Crítico y la Co-Creación en la Danza ante la Inteligencia Artificial"

**NOTA CRÍTICA**: Este capítulo cumple una función ESENCIAL en la metodología de la tesis: validar argumentativamente el marco teórico mediante su aplicación a casos conceptuales. Las viñetas analíticas no son meros "ejemplos" sino el mecanismo de validación teórica de toda la investigación.

## Naturaleza Especial del Capítulo 6

A diferencia de los capítulos anteriores, el Capítulo 6 es un capítulo de **APLICACIÓN, DISCUSIÓN Y REFLEXIÓN CRÍTICA**:

1. **Es aplicación**: El marco "Resistencia Encarnada" se pone a prueba mediante viñetas analíticas
2. **Es validación**: Demuestra el "poder heurístico" del marco para generar análisis nuevos
3. **Es proyección**: Desarrolla implicaciones para diferentes audiencias
4. **Es autocrítica**: Reflexiona honestamente sobre fortalezas y limitaciones

## Estructura del Capítulo 6

### 6.1. Validación mediante Viñetas Analíticas (Estudios de Caso Conceptuales)

**Introducción a las Viñetas** (~500 palabras):
- Qué son las viñetas analíticas y su rol metodológico
- Criterios de selección de los tres casos
- Cómo se aplicará el marco en cada viñeta

#### 6.1.1. Viñeta A (Análisis Crítico): La Automatización de la Pedagogía del Ballet Clásico
**Fuente**: `vineta-A-ballet-pedagogia.md`
**Tipo de análisis**: CRÍTICO - Evaluar qué resiste y qué podría ser asistido
**Extensión estimada**: 3000-4000 palabras
**Estructura interna**:
1. Presentación del caso: El sistema pedagógico del ballet clásico
2. Aplicación de las 4 dimensiones del marco:
   - D1: Cognición corporeizada en la transmisión del conocimiento
   - D2: Análisis de tareas del maestro de ballet
   - D3: Transmisión de criterios estéticos
   - D4: El ballet como tradición cultural
3. Aplicación de la lente ético-política: ¿Quién gana/pierde?
4. Conclusión de la viñeta: Mapa de resistencia/co-creación

#### 6.1.2. Viñeta B (Co-Creación): Escenario de Composición Coreográfica Aumentada por IA
**Fuente**: `vineta-B-coreografia-aumentada.md`
**Tipo de análisis**: PROPOSITIVO - Orientar colaboración significativa
**Extensión estimada**: 3000-4000 palabras
**Estructura interna**:
1. Presentación del caso: Coreógrafos trabajando con IA (casos reales)
2. Aplicación de las 4 dimensiones + lente ético-política
3. El concepto de "socio hermenéutico esencial" en acción
4. Criterios para una co-creación significativa
5. Conclusión: Principios para la colaboración humano-IA en coreografía

#### 6.1.3. Viñeta C (Análisis Estético): Valor y Significado en una Performance de un Ejecutante Posthumano
**Fuente**: `vineta-C-ejecutante-posthumano.md`
**Tipo de análisis**: ESTÉTICO/FILOSÓFICO - El caso límite
**Extensión estimada**: 3000-4000 palabras
**Estructura interna**:
1. Presentación del caso: Performances con robots/avatares
2. Aplicación del marco: Transformación del valor estético
3. Lo que el caso límite revela sobre la "resistencia encarnada"
4. Reflexión: ¿Es "danza" lo que hace un robot?
5. Conclusión: El valor del contraste

#### Síntesis de las Viñetas (~1000 palabras):
- Patrones transversales identificados
- Qué demuestran las viñetas sobre el poder heurístico del marco
- Ajustes o refinamientos sugeridos por la aplicación

### 6.2. Implicaciones y Proyecciones del Marco

**Introducción** (~300 palabras):
- El marco como herramienta para diferentes audiencias

#### 6.2.1. Para la Investigación Futura en Artes, Tecnología y Humanidades
**Extensión estimada**: 800-1000 palabras
- Líneas de investigación empírica que abre el marco
- Conexiones con otros campos (posthumanismo, estudios de ciencia y tecnología)
- Preguntas de investigación derivadas

#### 6.2.2. Para Artistas y Creadores: Hacia una Práctica Crítica y Aumentada
**Extensión estimada**: 800-1000 palabras
- El marco como "lenguaje de valoración" para artistas
- Criterios para evaluar colaboraciones con IA
- Empoderamiento frente a la presión tecnológica

#### 6.2.3. Para la Formación en Danza: Nuevas Pedagogías para un Nuevo Siglo
**Extensión estimada**: 800-1000 palabras
- Implicaciones curriculares del marco
- Integración crítica de tecnología en la enseñanza
- Preservación del *Leib* como centro de la formación

#### 6.2.4. Para el Desarrollo Tecnológico y las Políticas Culturales
**Extensión estimada**: 800-1000 palabras
- El marco como guía para diseñadores de tecnología dancística
- Recomendaciones para políticas de innovación en artes
- Protección de los derechos de los artistas en la era de la IA

### 6.3. Autocrítica: Fortalezas, Limitaciones y Futuras Iteraciones del Marco

**Extensión estimada**: 2000-2500 palabras

**Estructura interna**:

#### Fortalezas del Marco
- Síntesis interdisciplinaria lograda
- Poder heurístico demostrado
- Equilibrio entre análisis crítico y orientación propositiva
- Integración de la lente ético-política

#### Limitaciones Reconocidas
- Alcance teórico (no validación empírica)
- Foco en tradiciones occidentales de danza
- Tensiones epistemológicas no resueltas entre pilares
- Limitaciones de las viñetas como metodología

#### Futuras Iteraciones
- Hacia una validación empírica del marco
- Extensión a otras artes performáticas
- Desarrollo de herramientas operativas (checklists, escalas)
- Necesidad de actualización ante cambios tecnológicos

## Requisitos de Ejecución

### Fase 1: Síntesis y Planificación

1. **Analiza todos los sources del Capítulo 6**
2. **Verifica dominio del marco** (Cap. 5): El marco debe aplicarse correctamente
3. **Genera** `sections/6-discusion/_section-outline.md`
4. **Mapea explícitamente**:
   - Cómo se aplican las 4 dimensiones en cada viñeta
   - Referencias cruzadas necesarias a Caps 3, 4 y 5
   - Puntos donde se requiere decisión autoral

### Fase 2: Redacción y Composición

1. **Genera archivos de contenido** en `sections/6-discusion/content/`:
   - `6.0-introduccion-discusion.md` (introducción breve al capítulo)
   - `6.1.0-intro-vinetas.md`
   - `6.1.1-vineta-A-ballet.md`
   - `6.1.2-vineta-B-coreografia.md`
   - `6.1.3-vineta-C-posthumano.md`
   - `6.1.4-sintesis-vinetas.md`
   - `6.2.0-intro-implicaciones.md`
   - `6.2.1-investigacion-futura.md`
   - `6.2.2-artistas-creadores.md`
   - `6.2.3-formacion-danza.md`
   - `6.2.4-politicas-tecnologia.md`
   - `6.3-autocritica.md`

2. **Formato**: APA 7 para todas las citas
3. **Referencias cruzadas**: EXTENSIVAS hacia Caps 3, 4 y 5
4. **Anchors** en todos los encabezados

### Fase 3: Refinamiento y Evaluación

1. Aplica el sistema IRA para humanizar el texto
2. Genera reporte de evaluación
3. **ESPECIAL**: Verifica que las viñetas demuestren genuinamente el marco

## Criterios de Calidad Específicos para Capítulo 6

### Validación del Marco

- [ ] ¿Cada viñeta aplica correctamente las 4 dimensiones?
- [ ] ¿La lente ético-política está integrada en cada análisis?
- [ ] ¿Las viñetas demuestran el "poder heurístico" del marco?
- [ ] ¿Se genera conocimiento nuevo (no solo se ilustra el marco)?

### Coherencia Interna

- [ ] ¿Las tres viñetas son suficientemente diferentes para mostrar versatilidad?
- [ ] ¿Los patrones transversales identificados son genuinos?
- [ ] ¿Las implicaciones se derivan lógicamente del marco y las viñetas?

### Honestidad Intelectual

- [ ] ¿La autocrítica es genuina, no defensiva?
- [ ] ¿Se reconocen limitaciones reales?
- [ ] ¿Las futuras iteraciones son específicas y accionables?

### Referencias Cruzadas

- [ ] ¿Las viñetas referencian correctamente las dimensiones del Cap. 5?
- [ ] ¿Los conceptos clave de Caps 3 y 4 se citan cuando son relevantes?
- [ ] ¿El formato de cross-references es consistente?

## Outputs Esperados

Al finalizar:
- [ ] `_section-outline.md` con estructura detallada
- [ ] 12 archivos de contenido en `content/`
- [ ] `crossref-index.json` con anchors y referencias
- [ ] Reporte de evaluación con puntuación
- [ ] Lista de marcadores [NOTA:], [PENDIENTE:], [REVISAR:]

## Notas Críticas

1. **APLICAR, NO REPETIR**: Las viñetas aplican el marco, no lo explican de nuevo
2. **EVIDENCIA DE PODER HEURÍSTICO**: Cada viñeta debe generar insights no obvios
3. **EQUILIBRIO**: Ni tecno-optimismo ingenuo ni ludismo reactivo
4. **AUTOCRÍTICA HONESTA**: Este capítulo gana credibilidad por su humildad epistémica
5. **PREPARAR CONCLUSIONES**: El cierre debe facilitar la redacción del Cap. 7

## Conexiones con el Marco Teórico (Cap. 5)

### Aplicación de las Dimensiones

Para cada viñeta, verificar la aplicación correcta:

| Dimensión | En Viñeta A | En Viñeta B | En Viñeta C |
|-----------|-------------|-------------|-------------|
| D1: Cognición Corporeizada | Transmisión del conocimiento tácito | El *Leib* como filtro de sugerencias IA | Ausencia de *Leib* en el performer |
| D2: Trabajo Creativo | Tareas del maestro | Tareas del coreógrafo | Desplazamiento del trabajo |
| D3: Valor Estético | Criterios de belleza en ballet | Nuevo valor de la sinergia | Transformación del valor |
| D4: Cultural | Ballet como tradición | Receptividad cultural a IA | Contextos de aceptación |
| Lente Ética | Cuerpos privilegiados | Control de herramientas | Implicaciones laborales |

### Referencias Cruzadas Esperadas

Las viñetas DEBEN referenciar:
- `[Paragraph Number & Page Number](#cognicion-corporeizada)` - Cap. 3
- `[Paragraph Number & Page Number](#conocimiento-tacito)` - Cap. 3
- `[Paragraph Number & Page Number](#presencia-escenica)` - Cap. 3
- `[Paragraph Number & Page Number](#tareas-rutinarias)` - Cap. 4
- `[Paragraph Number & Page Number](#brecha-comprension)` - Cap. 4
- `[Paragraph Number & Page Number](#arquitectura-marco)` - Cap. 5
- `[Paragraph Number & Page Number](#dimension-cognicion)` - Cap. 5
- `[Paragraph Number & Page Number](#analisis-poder)` - Cap. 5
- `[Paragraph Number & Page Number](#interrelaciones)` - Cap. 5

Por favor, ejecuta el pipeline completo y proporciona actualizaciones de progreso en cada fase.
```

---

## Checklist Pre-Ejecución

### Verificación de Prerrequisitos

**Capítulos anteriores:**

- [ ] Cap 3 completo y validado
- [ ] Cap 4 completo y validado
- [ ] Cap 5 completo y validado
- [ ] Revisión de Caps 3-4-5 aprobada

**Sources del Capítulo 6:**

- [ ] `vineta-A-ballet-pedagogia.md` existe en `sources/`
- [ ] `vineta-B-coreografia-aumentada.md` existe en `sources/`
- [ ] `vineta-C-ejecutante-posthumano.md` existe en `sources/`

**Estructura:**

- [ ] Carpeta `sections/6-discusion/content/` existe
- [ ] Carpeta `sections/6-discusion/evaluation/` existe

---

## Flujo de Preparación Recomendado

Antes de ejecutar este prompt SRAMA, sigue este orden:

### Paso 1: Verificar Revisión Aprobada

```
Confirma que sections/5-marco-resistencia/evaluation/revision_report-3-4-5.md
indica "PASSED" o "Ready for Chapter 6".
```

### Paso 2: Generar Sources de las Viñetas

Ejecuta los prompts de Deep Research en este orden:

1. **Viñeta A (Ballet)**:

   ```
   @sections/6-discusion/prompts/DR_Cap6_Vineta_A_Ballet_Pedagogia.md
   ```

   - Incluir como contexto: Caps 3, 4, 5 completos
   - Guardar resultado en: `sections/6-discusion/sources/vineta-A-ballet-pedagogia.md`

2. **Viñeta B (Coreografía)**:

   ```
   @sections/6-discusion/prompts/DR_Cap6_Vineta_B_Coreografia_Aumentada.md
   ```

   - Incluir como contexto: Caps 3, 4, 5 completos
   - Guardar resultado en: `sections/6-discusion/sources/vineta-B-coreografia-aumentada.md`

3. **Viñeta C (Posthumano)**:

   ```
   @sections/6-discusion/prompts/DR_Cap6_Vineta_C_Ejecutante_Posthumano.md
   ```

   - Incluir como contexto: Caps 3, 4, 5 completos
   - Guardar resultado en: `sections/6-discusion/sources/vineta-C-ejecutante-posthumano.md`

**NOTA**: Los tres prompts pueden ejecutarse en paralelo en conversaciones separadas.

### Paso 3: Verificar Calidad de Sources

Antes de ejecutar SRAMA, revisa que cada source:

- [ ] Contiene análisis desde las 4 dimensiones del marco
- [ ] Incluye la lente ético-política
- [ ] Tiene síntesis argumentativa clara
- [ ] Incluye referencias bibliográficas

### Paso 4: Ejecutar SRAMA

Con todos los sources listos, ejecuta este prompt SRAMA.

---

## Tiempo Estimado

- **Generación de sources (Paso 2)**: ~90-120 minutos total (o ~40-50 min cada uno si se ejecutan en paralelo)
- **Verificación de sources (Paso 3)**: ~15 minutos
- **Ejecución SRAMA (Paso 4)**: ~90-120 minutos
- **Total secuencial**: 3-4 horas
- **Total con paralelización de sources**: 2-3 horas

(El Capítulo 6 es uno de los más extensos debido a las tres viñetas detalladas)

---

## Notas Adicionales

### Sobre las Viñetas Analíticas

Las viñetas no son "ejemplos ilustrativos" sino el **mecanismo de validación** del marco. Según la metodología declarada en la Base de la Tesis:

> "La validación del marco no será empírica, sino argumentativa, demostrada a través de su poder heurístico al aplicarlo a viñetas analíticas (casos de estudio conceptuales detallados) que ilustren su capacidad para generar análisis nuevos y profundos."

Por lo tanto, cada viñeta debe:

1. Aplicar sistemáticamente las 4 dimensiones + lente ética
2. Generar insights que no serían posibles sin el marco
3. Revelar aspectos no obvios del caso analizado
4. Demostrar la utilidad práctica del marco

### Sobre la Autocrítica

La sección 6.3 es crítica para la credibilidad de la tesis. Una autocrítica genuina incluye:

- Limitaciones que el autor reconoce honestamente
- Tensiones no resueltas en el marco
- Áreas donde la evidencia es insuficiente
- Caminos de mejora específicos

Evitar:

- Autocrítica defensiva ("esto podría verse como limitación pero en realidad...")
- Falsa modestia
- Limitaciones que no son realmente relevantes

---

*Última actualización: Enero 2026*
