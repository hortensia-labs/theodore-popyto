# Guía del Sistema de Redacción Académica Multi-Agente (SRAMA)

## Introducción

El Sistema de Redacción Académica Multi-Agente (SRAMA) es un flujo de trabajo automatizado diseñado para transformar materiales de investigación en contenido académico de calidad doctoral para la tesis "Resistencia Encarnada".

Este documento proporciona una guía completa para utilizar el sistema, entender sus componentes, y gestionar el proceso de redacción.

---

## Arquitectura del Sistema

### Componentes Principales

```
.claude/
├── agents/
│   ├── srama-orchestrator.md      # Coordinador principal
│   ├── synthesis-agent.md         # Análisis y planificación
│   ├── continuity-agent.md        # Coherencia con la tesis
│   ├── drafting-agent.md          # Redacción de contenido
│   ├── crossref-agent.md          # Referencias cruzadas
│   ├── evaluation-agent.md        # Evaluación de calidad
│   │
│   │ # Sistema IRA (existente)
│   ├── ira-orchestrator.md
│   ├── diagnostic_agent.md
│   ├── architect_agent.md
│   ├── voice_agent.md
│   ├── simplification_agent.md
│   └── verification_agent.md
│
└── skills/
    └── academic-writing-style.md  # Reglas de estilo
```

### Flujo de Trabajo

```
FASE 1: SÍNTESIS Y PLANIFICACIÓN
    sources/*.md
         │
         ▼
    [synthesis-agent]  ──────────────────┐
         │                               │
         ▼                               ▼
    _section-outline.md          [continuity-agent]
                                         │
                                         ▼
                               continuity-report.md

FASE 2: REDACCIÓN Y COMPOSICIÓN
    _section-outline.md
         │
         ▼
    [drafting-agent]
         │
         ▼
    content/*.md (borrador)
         │
         ▼
    [crossref-agent]
         │
         ▼
    content/*.md + crossref-index.json

FASE 3: REFINAMIENTO Y EVALUACIÓN
    content/*.md
         │
         ▼
    [Sistema IRA]
    diagnostic → architect → voice → verification
         │
         ▼
    content/*.md (humanizado)
         │
         ▼
    [evaluation-agent]
         │
         ▼
    evaluation/chapter-X-report.md
         │
         ▼
    REVISIÓN HUMANA
```

---

## Estructura de Archivos por Sección

```
sections/[section-name]/
├── _section-outline.md           # Esquema estructural (generado)
├── _workflow-status.json         # Estado del flujo de trabajo
│
├── sources/                      # Materiales de investigación
│   ├── 3.1.1 Tema uno.md
│   ├── 3.1.2 Tema dos.md
│   └── ...
│
├── content/                      # Contenido final (para InDesign)
│   ├── 3.1.1-tema-uno.md
│   ├── 3.1.2-tema-dos.md
│   └── ...
│
├── references/                   # Gestión de referencias
│   ├── bibliography-from-sources.md
│   ├── bibliography-draft.md
│   ├── crossref-index.json
│   └── crossref-report.md
│
└── evaluation/                   # Reportes de evaluación
    └── chapter-3-report.md
```

---

## Uso del Sistema

### Prerrequisitos

1. **Materiales de investigación** en `sources/` con formato Markdown
2. **Citas en formato APA 7** dentro de los sources
3. **Documentos base** actualizados:
   - `core/Base de la tesis.md`
   - `core/Indice de contenidos.md`

### Ejecución Básica

Para ejecutar el pipeline completo para una sección:

```
Invocar: srama-orchestrator

"Por favor ejecuta el pipeline completo de SRAMA para 
sections/3-fundamentos-1/"
```

### Ejecución por Fases

Si prefieres ejecutar fase por fase:

**Fase 1 - Síntesis:**
```
Invocar: synthesis-agent

"Analiza los sources de sections/3-fundamentos-1/ y genera 
el outline estructural."
```

```
Invocar: continuity-agent

"Valida el outline de sections/3-fundamentos-1/ contra 
la base de la tesis."
```

**Fase 2 - Redacción:**
```
Invocar: drafting-agent

"Redacta el contenido de la sección 3.1 basándote en el 
outline validado y los sources."
```

```
Invocar: crossref-agent

"Valida las referencias cruzadas del contenido generado 
en sections/3-fundamentos-1/content/"
```

**Fase 3 - Refinamiento:**
```
Invocar: ira-orchestrator

"Humaniza el contenido de sections/3-fundamentos-1/content/"
```

```
Invocar: evaluation-agent

"Evalúa la calidad académica del capítulo 3."
```

---

## Orden de Redacción Recomendado

Debido a las dependencias entre capítulos:

### Fase A: Capítulos Independientes (Paralelos)
- **Capítulo 3**: Fundamentos Teóricos I
- **Capítulo 4**: Fundamentos Teóricos II

Estos capítulos pueden redactarse simultáneamente ya que no dependen uno del otro.

### Fase B: Capítulos Dependientes (Secuenciales)
Una vez completados los capítulos 3 y 4:

1. **Capítulo 5**: El Marco "Resistencia Encarnada"
   - Integra contenido de capítulos 3 y 4
   - Requiere referencias cruzadas a ambos

2. **Capítulo 6**: Discusión (Viñetas Analíticas)
   - Aplica el marco del capítulo 5
   - Referencia conceptos de capítulos 3 y 4

3. **Capítulo 1**: Introducción
   - Presenta el contenido que se desarrollará
   - Requiere conocer los argumentos finales

4. **Capítulo 2**: Metodología
   - Describe cómo se construyó el marco
   - Refleja el proceso real de la investigación

5. **Capítulo 7**: Conclusiones
   - Síntesis de toda la tesis
   - Último en redactarse

---

## Convenciones de Nomenclatura

### Archivos de Contenido
```
X.Y.Z-nombre-descriptivo.md

Ejemplos:
3.1.1-cuerpo-conocimiento.md
3.1.2-conocimiento-tacito.md
4.2.1-ia-generativa-creatividad.md
```

### Anchors de Referencias Cruzadas
```
{#nombre-descriptivo}

Ejemplos:
{#cuerpo-conocimiento}
{#leib-korper}
{#marco-resistencia}
```

---

## Marcadores para Revisión Humana

Durante la generación, los agentes insertan marcadores para elementos que requieren atención humana:

| Marcador | Significado | Acción Requerida |
|----------|-------------|------------------|
| `[NOTA: ...]` | Información que verificar | Confirmar o corregir |
| `[PENDIENTE: ...]` | Decisión del autor necesaria | Tomar decisión |
| `[REVISAR: ...]` | Posible problema detectado | Evaluar y resolver |
| `[FUENTE: ...]` | Referencia adicional sugerida | Añadir si pertinente |

---

## Quality Gates

El sistema incluye puntos de control de calidad automáticos:

### Gate 1: Post-Síntesis
- ✓ Todos los sources analizados
- ✓ Estructura alineada con índice
- ✓ Argumentos claramente mapeados

### Gate 2: Post-Continuidad
- ✓ Alineación con hipótesis central
- ✓ Pilares teóricos apropiadamente tratados
- ✓ Sin inconsistencias terminológicas

### Gate 3: Post-Redacción
- ✓ Todas las subsecciones completadas
- ✓ Citas presentes para afirmaciones clave
- ✓ Anchors en todos los encabezados

### Gate 4: Post-CrossRef
- ✓ Todos los anchors válidos y únicos
- ✓ Todas las referencias resuelven
- ✓ Sin enlaces rotos

### Gate 5: Post-IRA
- ✓ Puntuación de detección AI < 5%
- ✓ Sin patrones de "bypasser"
- ✓ Registro académico mantenido

### Gate 6: Post-Evaluación
- ✓ Puntuación ≥ 7.0/10
- ✓ Sin issues de alta prioridad
- ✓ Alineación con tesis confirmada

---

## Resolución de Problemas

### El outline no refleja todos los sources
**Causa**: Posible source no leído o formato incompatible
**Solución**: Verificar que todos los sources estén en formato Markdown válido

### Referencias cruzadas a capítulos futuros
**Causa**: Normal para capítulos con dependencias
**Solución**: El sistema inserta marcadores `[PENDIENTE: ref a Cap X]` que se resuelven cuando el capítulo destino existe

### Puntuación de evaluación baja
**Causa**: Varias posibles (argumentación, citas, síntesis)
**Solución**: Revisar el reporte de evaluación para issues específicos y re-procesar las secciones afectadas

### IRA no reduce detección de AI
**Causa**: Contenido puede requerir reescritura fundamental
**Solución**: Usar el módulo "Forget and Rewrite" del sistema IRA para párrafos problemáticos

---

## Mejores Prácticas

1. **Revisar el outline antes de la redacción masiva**: El outline determina toda la estructura posterior

2. **Mantener sources actualizados**: Si añades nueva investigación, re-ejecutar desde síntesis

3. **No editar manualmente `content/` durante el pipeline**: Esperar a la fase de revisión humana final

4. **Resolver marcadores antes de publicación**: Buscar todos los `[NOTA:]`, `[PENDIENTE:]`, `[REVISAR:]`

5. **Verificar anchor registry periodicamente**: Especialmente al añadir nuevos capítulos

---

## Integración con InDesign

Los archivos en `content/` están diseñados para ser procesados hacia InDesign:

1. Solo archivos `.md` listos para publicación
2. Sin archivos auxiliares (`_section-outline.md` está fuera)
3. Referencias cruzadas en formato compatible con el script de conversión
4. Citas en formato APA 7 listas para bibliografía

---

## Contacto y Soporte

Para problemas con el sistema SRAMA, revisar:
- Los reportes de evaluación en `evaluation/`
- El estado del workflow en `_workflow-status.json`
- Los logs de cada agente individual

Para modificar el comportamiento del sistema:
- Ajustar los agentes en `.claude/agents/`
- Modificar el skill de estilo en `.claude/skills/academic-writing-style.md`
