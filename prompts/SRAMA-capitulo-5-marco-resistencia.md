# Prompt de Orquestación SRAMA: Capítulo 5 - El Marco "Resistencia Encarnada"

## ⚠️ PRERREQUISITOS CRÍTICOS

Antes de ejecutar este prompt, verifica que:

### 1. Capítulos 3 y 4 están COMPLETOS

- [ ] `sections/3-fundamentos-1/content/` contiene todos los archivos de contenido
- [ ] `sections/4-fundamentos-2/content/` contiene todos los archivos de contenido
- [ ] Ambos capítulos han pasado la validación de continuity-agent

### 2. Sources del Capítulo 5 están GENERADOS

El Capítulo 5 requiere sources específicos que deben generarse ANTES de ejecutar SRAMA:

**Dimensiones del Marco (usar prompts FA existentes):**

- [ ] `5.2.1-dimension-cognicion.md` ← Generar con `FA_Cap5_1_Dimension_Cognicion.md`
- [ ] `5.2.2-dimension-valor.md` ← Generar con `FA_Cap5_2_Dimension_Valor_Artistico.md`
- [ ] `5.2.3-dimension-interaccion.md` ← Generar con `FA_Cap5_3_Dimension_Interaccion.md`
- [ ] `5.2.4-dimension-sociocultural.md` ← Generar con `FA_Cap5_4_Dimension_SocioCultural.md`

**Dimensión Ético-Política (NUEVO - CRÍTICO):**

- [ ] `5.3-dimension-etico-politica.md` ← Generar con `DR_Cap5_Dimension_Etico_Politica.md`

Todos estos archivos deben estar en `sections/5-marco-resistencia/sources/`

---

## Instrucciones de Uso

### Archivos a incluir como contexto (@)

**Obligatorios:**

```
@core/Base de la tesis.md
@core/Indice de contenidos.md
@.claude/skills/academic-writing-style.md
@.claude/agents/srama-orchestrator.md
@rules/cross-references.md
```

**Sources del Capítulo 5:**

```
@sections/5-marco-resistencia/sources/
```

**Contenido de Capítulos 3 y 4 (CRÍTICO):**

```
@sections/3-fundamentos-1/content/
@sections/4-fundamentos-2/content/
```

**Opcional pero recomendado:**

```
@sections/3-fundamentos-1/_section-outline.md
@sections/4-fundamentos-2/_section-outline.md
```

---

## Prompt

```
Ejecuta el sistema SRAMA (Sistema de Redacción Académica Multi-Agente) para generar el contenido completo del Capítulo 5: "El Marco 'Resistencia Encarnada': Un Modelo para el Análisis y la Co-Creación" de mi tesis doctoral.

## Contexto de la Tesis

**Título**: "Resistencia Encarnada: Hacia un Marco Teórico Interdisciplinario para el Análisis Crítico y la Co-Creación en la Danza ante la Inteligencia Artificial"

**NOTA CRÍTICA**: Este es el capítulo CENTRAL de la tesis. Aquí se presenta formalmente el marco teórico completo que constituye la contribución original de la investigación. La calidad de este capítulo es determinante para el valor académico de toda la tesis.

## Naturaleza Especial del Capítulo 5

A diferencia de los capítulos 3 y 4 (que desarrollan fundamentos), el Capítulo 5 es un capítulo de **SÍNTESIS E INTEGRACIÓN**:

1. **No es repetición**: No debe repetir lo que ya está en los capítulos 3 y 4
2. **Es integración**: Debe mostrar cómo los pilares interactúan entre sí
3. **Es propositivo**: Presenta el marco como una herramienta analítica original
4. **Añade la lente ético-política**: Esta dimensión aparece aquí de forma EXPLÍCITA por primera vez

## Estructura del Capítulo 5

### 5.1. Arquitectura General del Marco
**Objetivo**: Presentar formalmente el marco, su propósito y su doble función (analítica y propositiva)
**Fuentes**: Síntesis de Base de la Tesis + estructura derivada de Cap 3 y 4
**Extensión estimada**: 1500-2000 palabras
**Contenido**:
- Definición formal del marco "Resistencia Encarnada"
- Propósito: articular el valor irreductible + guiar la co-creación
- Las dos funciones: analítica (evaluar resistencia) y propositiva (diseñar colaboración)
- Presentación de los componentes (4 pilares + lente transversal)

### 5.2. Los Cuatro Pilares en Interacción
**Fuentes**: Documentos FA_Cap5_1 a FA_Cap5_4 en sources/
**IMPORTANTE**: Los sources para estas subsecciones son ensayos completos. Tu tarea es:
- Integrarlos coherentemente
- Añadir transiciones entre dimensiones
- Asegurar referencias cruzadas a Caps 3 y 4
- Mantener la voz consistente

#### 5.2.1. Dimensión 1: La Singularidad de la Cognición Corporeizada
- Basado en source: 5.2.1-dimension-cognicion.md
- Referencias a: Cap 3.1 (Cognición Corporeizada)

#### 5.2.2. Dimensión 2: La Complejidad del Trabajo Creativo-Colaborativo  
- Basado en source: 5.2.2-dimension-valor.md
- Referencias a: Cap 4.1 (Economía Laboral)

#### 5.2.3. Dimensión 3: La Generación de Valor y Significado Estético
- Basado en source: 5.2.3-dimension-interaccion.md
- Referencias a: Cap 3.2 (Estética y Valor)

#### 5.2.4. Dimensión 4: La Poética y Contextualización Cultural
- Basado en source: 5.2.4-dimension-sociocultural.md
- Referencias a: Cap 3.3 (Poética de la Danza)

### 5.3. La Lente Transversal: La Dimensión Ético-Política
**Fuentes**: 5.3-dimension-etico-politica.md
**CRÍTICO**: Esta es contenido NUEVO, no cubierto en capítulos anteriores
**Extensión estimada**: 3000-4000 palabras

#### 5.3.1. El Análisis de Poder: ¿Cui bono?
- Quién se beneficia de distintas definiciones de lo automatizable
- Impacto diferencial en distintas comunidades artísticas
- El riesgo de reproducir jerarquías existentes

#### 5.3.2. La Problematización de la Frontera Humano/Automatizable
- La frontera como construcción social, no natural
- Contingencia histórica de las fronteras tecnológicas
- La pregunta crítica: "¿Quién traza la línea y para qué fines?"

#### 5.3.3. Desvinculando "Codificable" de "Sin Valor"
- Rechazo de la ecuación automatizable = menos valioso
- Valor del oficio, la tradición, la práctica repetitiva
- Afirmación del valor de todas las formas de danza

### 5.4. El Modelo en Acción: Interrelaciones y Visión Holística
**Objetivo**: Mostrar cómo las 4 dimensiones + la lente interactúan
**Fuentes**: Síntesis de las secciones anteriores
**Extensión estimada**: 1500-2000 palabras
**Contenido**:
- Cómo cada dimensión refuerza a las otras
- Ejemplos de cómo una tarea puede analizarse desde múltiples dimensiones
- La lente ético-política como atravesando todas las dimensiones
- El marco como sistema dinámico, no como checklist estático

### 5.5. Representación Visual del Marco "Resistencia Encarnada"
**Objetivo**: Proporcionar una descripción para una figura/diagrama del marco
**Extensión estimada**: 500-800 palabras
**Contenido**:
- Descripción detallada de la representación visual propuesta
- Explicación de la lógica visual (por qué se representa así)
- [NOTA: La figura real se generará posteriormente, aquí solo la descripción]

## Requisitos de Ejecución

### Fase 1: Síntesis y Planificación
1. Analiza todos los sources del Capítulo 5
2. Revisa el contenido de los Capítulos 3 y 4 para identificar referencias cruzadas
3. Genera `sections/5-marco-resistencia/_section-outline.md`
4. Mapea explícitamente:
   - Qué conceptos de Cap 3 se referencian y dónde
   - Qué conceptos de Cap 4 se referencian y dónde
   - Qué es contenido NUEVO de este capítulo

### Fase 2: Redacción y Composición
1. Genera archivos de contenido en `sections/5-marco-resistencia/content/`:
   - `5.1-arquitectura-marco.md`
   - `5.2.1-dimension-cognicion.md`
   - `5.2.2-dimension-trabajo.md`
   - `5.2.3-dimension-valor.md`
   - `5.2.4-dimension-poetica.md`
   - `5.3.1-analisis-poder.md`
   - `5.3.2-problematizacion-frontera.md`
   - `5.3.3-codificable-valor.md`
   - `5.4-interrelaciones.md`
   - `5.5-representacion-visual.md`

2. Formato: APA 7 para todas las citas
3. Referencias cruzadas: EXTENSIVAS hacia Caps 3 y 4
4. Anchors en todos los encabezados

### Fase 3: Refinamiento y Evaluación
1. Aplica el sistema IRA para humanizar el texto
2. Genera reporte de evaluación
3. ESPECIAL: Verifica que NO hay repetición innecesaria de Caps 3 y 4

## Criterios de Calidad Específicos para Capítulo 5

### Originalidad
- [ ] ¿Presenta una síntesis original, no solo un resumen?
- [ ] ¿Añade valor más allá de la suma de las partes?
- [ ] ¿La integración de pilares genera insights nuevos?

### Coherencia
- [ ] ¿El marco se presenta como un todo coherente?
- [ ] ¿Las transiciones entre secciones son fluidas?
- [ ] ¿La lente ético-política realmente atraviesa el marco?

### Utilidad
- [ ] ¿El marco es aplicable (se puede usar para analizar casos)?
- [ ] ¿Prepara adecuadamente las viñetas del Capítulo 6?
- [ ] ¿Es claro qué preguntas permite responder el marco?

### Referencias Cruzadas
- [ ] ¿Hay referencias explícitas a conceptos del Cap 3?
- [ ] ¿Hay referencias explícitas a conceptos del Cap 4?
- [ ] ¿Se usa el formato correcto de cross-references?

## Outputs Esperados

Al finalizar:
- [ ] `_section-outline.md` con mapeo completo a Caps 3 y 4
- [ ] 10 archivos de contenido en `content/`
- [ ] `crossref-index.json` con anchors y referencias
- [ ] Reporte de evaluación con puntuación
- [ ] Lista de marcadores [NOTA:], [PENDIENTE:], [REVISAR:]

## Notas Críticas

1. **NO REPETIR**: Si algo ya está explicado en Cap 3 o 4, REFERENCIAR, no repetir
2. **SÍNTESIS**: El valor está en la integración, no en la extensión
3. **LENTE ÉTICO-POLÍTICA**: Debe sentirse como una presencia constante, no como una sección aislada
4. **PREPARAR CAP 6**: El marco debe terminar listo para ser "usado" en las viñetas

Por favor, ejecuta el pipeline completo y proporciona actualizaciones de progreso en cada fase.
```

---

## Checklist Pre-Ejecución

### Verificación de Prerrequisitos

**Capítulos anteriores:**

- [ ] Cap 3 completo y validado
- [ ] Cap 4 completo y validado

**Sources del Capítulo 5:**

- [ ] 5.2.1-dimension-cognicion.md existe
- [ ] 5.2.2-dimension-valor.md existe
- [ ] 5.2.3-dimension-interaccion.md existe
- [ ] 5.2.4-dimension-sociocultural.md existe
- [ ] 5.3-dimension-etico-politica.md existe

**Estructura:**

- [ ] Carpeta `sections/5-marco-resistencia/content/` existe
- [ ] Carpeta `sections/5-marco-resistencia/evaluation/` existe

---

## Flujo de Preparación Recomendado

Antes de ejecutar este prompt SRAMA, sigue este orden:

### Paso 1: Verificar Caps 3 y 4

```
Confirma que sections/3-fundamentos-1/content/ y 
sections/4-fundamentos-2/content/ están completos.
```

### Paso 2: Generar Sources de las 4 Dimensiones

Ejecuta los prompts FA existentes, uno por uno, en este orden:

1. `FA_Cap5_1_Dimension_Cognicion.md` → guarda resultado en sources/
2. `FA_Cap5_2_Dimension_Valor_Artistico.md` → guarda resultado en sources/
3. `FA_Cap5_3_Dimension_Interaccion.md` → guarda resultado en sources/
4. `FA_Cap5_4_Dimension_SocioCultural.md` → guarda resultado en sources/

Cada uno requiere como contexto:

- Cap 3 completo
- Cap 4 completo (especialmente los sources DR_Cap4)

### Paso 3: Generar Source Ético-Político

Ejecuta:

```
research/prompts/capitulo-5/DR_Cap5_Dimension_Etico_Politica.md
```

Este es investigación NUEVA, no depende de Caps 3 y 4.
Guarda el resultado en `sections/5-marco-resistencia/sources/5.3-dimension-etico-politica.md`

### Paso 4: Ejecutar SRAMA

Con todos los sources listos, ejecuta este prompt SRAMA.

---

## Tiempo Estimado

- Generación de sources (Paso 2-3): ~60-90 minutos total
- Ejecución SRAMA (Paso 4): ~60-90 minutos
- Total: 2-3 horas para el capítulo completo

(El Capítulo 5 es más complejo que 3 y 4 debido a su naturaleza integradora)
