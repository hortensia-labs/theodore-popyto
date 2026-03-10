# Plan de Revisión: Hedging Acumulativo

**Fecha**: 10 de marzo de 2026
**Prioridad**: Mayor — debería resolverse
**Secciones afectadas**: Capítulos 1, 5, 7 (especialmente 7)
**Esfuerzo estimado**: Bajo (revisión estilística, no contenido nuevo)

---

## 1. Diagnóstico del problema

### Descripción

El uso excesivo de expresiones atenuantes ("parece ser", "sugiere", "podría argumentarse", "con razonable confianza") es particularmente problemático en el capítulo de conclusiones, donde tras seis capítulos de desarrollo el autor debería poder formular afirmaciones comprometidas. La saturación de hedging crea la impresión de un autor que no está dispuesto a sostener sus propias conclusiones.

### Relación con la pregunta de defensa #13

> "Si pudiera reducir sus conclusiones a tres afirmaciones fuertes — sin 'parece', sin 'sugiere', sin 'podría' — ¿cuáles serían? ¿Hay alguna afirmación que considere demostrada y no solo sugerida?"

Esta pregunta anticipada del tribunal es directamente provocada por el hedging acumulativo. Si el autor no la resuelve en el texto, tendrá que resolverla oralmente bajo presión.

### Tipos de hedging detectados

| Tipo | Ejemplos | Efecto |
|------|----------|--------|
| **Epistémico modal** | "podría argumentarse", "cabría sugerir", "es posible que" | Debilita la afirmación al convertirla en mera posibilidad |
| **Evidencial atenuado** | "parece ser", "sugiere", "los datos parecen indicar" | Introduce distancia entre el autor y su propia evidencia |
| **Limitadores de compromiso** | "con razonable confianza", "en cierta medida", "hasta cierto punto" | Recorta el alcance de la afirmación sin especificar el recorte |
| **Impersonal distanciador** | "se ha argumentado", "se podría considerar" | Borra la agencia del autor, como si el argumento no fuera suyo |
| **Doble hedging** | "parece sugerir que podría..." | Acumula atenuación hasta vaciar la proposición |

### Dónde es más problemático

| Capítulo | Problema específico |
|----------|-------------------|
| **7-Conclusiones** | El más grave: tras 6 capítulos de desarrollo, las conclusiones deberían contener las afirmaciones más fuertes de la tesis, pero el hedging las diluye |
| **5-Marco** | La presentación del marco usa lenguaje tentativo incluso para definiciones que son decisiones del autor (no hipótesis por verificar) |
| **1-Introducción** | El planteamiento del problema y la hipótesis se presentan con excesiva precaución, debilitando la motivación |

---

## 2. Estrategia de resolución

### Principio rector

**Diferenciar entre hedging legítimo y hedging acumulativo/evasivo.** El hedging no es siempre malo: en una tesis teórico-conceptual, la honestidad intelectual requiere modestia epistémica. El problema es la *saturación*: cuando todo se presenta como tentativo, nada se afirma. La solución es crear un contraste claro entre lo que se afirma con compromiso y lo que se matiza con precaución.

### Protocolo de tres niveles

#### Nivel 1: Afirmaciones fuertes (sin hedging)

Proposiciones que la tesis ha argumentado extensamente y que el autor sostiene con compromiso. Estas se formulan en indicativo, sin atenuación:

- Definiciones del marco (son decisiones del autor, no hipótesis)
- Contribuciones reconocidas por los tres revisores
- Conclusiones que se derivan directamente de la argumentación desarrollada
- Posicionamientos teóricos que la tesis asume explícitamente

**Formato**: "X es Y" / "La tesis demuestra que..." / "El marco establece que..."

#### Nivel 2: Afirmaciones moderadas (hedging puntual y preciso)

Proposiciones que tienen apoyo argumentativo pero cuyo alcance o universalidad está limitado. El hedging se usa para marcar el límite, no para debilitar la afirmación:

- Transferibilidad del marco a otros dominios
- Implicaciones que dependen de condiciones no controladas
- Proyecciones sobre el futuro de la tecnología

**Formato**: "X sugiere que Y, bajo las condiciones Z" / "En los casos analizados, X" (especificando la restricción, no atenuando la proposición)

#### Nivel 3: Hipótesis y líneas futuras (hedging legítimo)

Proposiciones que la tesis formula pero no pretende haber demostrado:

- Hipótesis para investigación futura
- Especulaciones sobre aplicaciones no exploradas
- Predicciones sobre desarrollos tecnológicos

**Formato**: "Queda por investigar si..." / "Una hipótesis derivada es que..." (hedging como marcador de agenda futura, no como evasión)

---

## 3. Plan de implementación

### Fase 1: Inventario de hedging en capítulos prioritarios

**Acción**: Búsqueda automatizada de patrones de hedging en Caps. 1, 5 y 7:

```bash
grep -rn "parece\|sugiere\|podría\|cabría\|posible que\|en cierta medida\|hasta cierto punto\|razonable confianza\|se ha argumentado\|se podría" sections/1-introduccion/content/*.md sections/5-marco-resistencia/content/*.md sections/7-conclusiones/content/*.md
```

**Producto**: Lista de instancias con contexto.

### Fase 2: Clasificación de cada instancia

Para cada instancia de hedging, clasificar como:

| Clasificación | Acción |
|---------------|--------|
| **Hedging evasivo** (el argumento ha sido desarrollado; la atenuación es innecesaria) | **Eliminar**: reformular en indicativo |
| **Hedging acumulativo** (una atenuación encima de otra) | **Reducir**: conservar un solo hedge; eliminar los demás |
| **Hedging legítimo** (el alcance o la evidencia genuinamente lo requieren) | **Conservar** |
| **Hedging impersonal** (borra agencia del autor) | **Reformular**: usar primera persona del plural o forma activa |

### Fase 3: Intervención por capítulo

#### Cap. 7 — Conclusiones (prioridad máxima)

**Objetivo**: Formular 3–4 afirmaciones fuertes sin hedging que constituyan el núcleo de la contribución.

**Afirmaciones candidatas** (a refinar tras leer el texto actual):

1. **Sobre la tipología tripartita**: "La tipología de limitaciones contingentes, arquitectónicas y ontológicas constituye una herramienta analítica que supera el binarismo puede/no-puede y permite evaluar diferenciadamente la relación entre prácticas dancísticas y sistemas de IA generativa."

2. **Sobre la resistencia encarnada**: "La práctica dancística produce y sostiene cualidades encarnadas —perceptivas, afectivas, éticas, laborales y estéticas— que no se reducen sin pérdida a descripciones informacionales; cuando la IA interviene, esas cualidades se reconfiguran, generando fricciones identificables y analizables."

3. **Sobre la lente ético-política**: "La incorporación de la dimensión ético-política como componente estructural del marco —no como apéndice— permite interrogar la distribución de poder, beneficio y riesgo en la automatización creativa, evitando la separación entre análisis técnico y juicio normativo."

4. **Sobre la productividad del marco**: "El marco de Resistencia Encarnada demostró productividad analítica al aplicarse a tres escenarios heterogéneos, generando distinciones no triviales entre dimensiones de resistencia que una aproximación monodimensional no captaría."

Estas afirmaciones se separan de lo que queda como hipótesis: la transferibilidad a otros dominios, la validación empírica completa, el futuro de la IA encarnada.

**Archivo principal**: `sections/7-conclusiones/content/7.2-contribucion.md`

#### Cap. 5 — Marco (prioridad alta)

**Objetivo**: Las definiciones del marco son decisiones del autor; no requieren hedging.

**Patrón de corrección**:
- "La dimensión cognitiva podría entenderse como..." → "La dimensión cognitiva se define como..."
- "La resistencia encarnada parece operar en..." → "La resistencia encarnada opera en..."
- "Se sugiere que las cuatro dimensiones..." → "Las cuatro dimensiones..."

**Archivos**: `sections/5-marco-resistencia/content/5.1-arquitectura-marco.md`, `5.2.1–5.2.4`

#### Cap. 1 — Introducción (prioridad media)

**Objetivo**: El planteamiento del problema y la hipótesis deben proyectar confianza en la relevancia y ambición del proyecto.

**Patrón de corrección**:
- "Parece existir un vacío conceptual..." → "Existe un vacío conceptual..." (o mejor: "Existe una fragmentación disciplinar que esta tesis aborda mediante...")
- "Podría argumentarse que la danza..." → "La danza..."

**Archivos**: `sections/1-introduccion/content/1.2-problema.md`, `1.4-pregunta-hipotesis.md`

### Fase 4: Creación de subsección explícita en Cap. 7

**Ubicación**: §7.2 (contribución) o §7.5 (consideraciones finales)
**Extensión**: ~300–400 palabras
**Contenido**: Un pasaje que separe explícitamente:

1. **Lo que la tesis afirma** (3–4 proposiciones fuertes, sin hedging)
2. **Lo que la tesis propone como hipótesis** (con hedging legítimo y preciso)
3. **Lo que la tesis identifica como pregunta abierta** (agenda futura)

Esta separación explícita desarma la pregunta de defensa #13 antes de que se formule.

---

## 4. Ejemplos de corrección

### Antes / Después

| Antes (hedging evasivo) | Después (afirmación comprometida) |
|--------------------------|-----------------------------------|
| "Parece ser que la danza ofrece una forma de resistencia a la automatización" | "La danza ofrece una forma de resistencia a la automatización, articulable mediante las cuatro dimensiones del marco propuesto" |
| "Podría argumentarse que la tipología tripartita supera el binarismo puede/no-puede" | "La tipología tripartita supera el binarismo puede/no-puede al distinguir entre limitaciones contingentes, arquitectónicas y ontológicas" |
| "Los resultados sugieren, con razonable confianza, que el marco podría tener utilidad analítica" | "El marco demostró utilidad analítica al generar distinciones no triviales en los tres escenarios analizados" |
| "Se ha argumentado a lo largo de esta investigación que la experiencia encarnada podría constituir un factor relevante" | "La experiencia encarnada constituye el eje central de la resistencia a la automatización, como se ha argumentado a lo largo de los seis capítulos precedentes" |

---

## 5. Criterios de completitud

- [ ] Inventario de hedging completado para Caps. 1, 5, 7
- [ ] Cada instancia clasificada (evasivo/acumulativo/legítimo/impersonal)
- [ ] Cap. 7 contiene 3–4 afirmaciones fuertes sin hedging
- [ ] Cap. 5 usa indicativo para definiciones del marco
- [ ] Cap. 1 usa lenguaje que proyecta confianza en el planteamiento
- [ ] Subsección de separación explícita (afirma/propone/pregunta) añadida a Cap. 7
- [ ] Hedging legítimo conservado donde corresponde (no se eliminó toda atenuación)
- [ ] El texto no suena arrogante (el hedging legítimo modera el tono)

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Eliminar demasiado hedging y sonar arrogante o dogmático | Conservar hedging en hipótesis y líneas futuras; el contraste entre afirmación fuerte y modestia legítima es retóricamente efectivo |
| Formular afirmaciones fuertes que la evidencia no sostiene | Solo formular como afirmación fuerte lo que los 6 capítulos han argumentado extensamente; el criterio es "¿lo defendería en la defensa oral?" |
| Inconsistencia: hedging eliminado en Cap. 7 pero persistente en Caps. 3–6 | Revisar también instancias clave en capítulos intermedios donde se construyen los argumentos que luego se concluyen |
| El tribunal nota que las afirmaciones fuertes son "solo" analíticas, no empíricas | La subsección de separación explícita anticipa esta objeción: las afirmaciones fuertes son sobre la productividad del marco, no sobre verdades empíricas absolutas |

---

## 7. Dependencias

- **Ejecutar DESPUÉS de** los planes 01 (circularidad), 02 (funcionalismo), 03 (constructivismo) — porque las afirmaciones fuertes del Cap. 7 dependen de que los argumentos subyacentes estén reforzados
- **Ejecutar DESPUÉS de** el plan 05 (viñetas) — porque la reformulación de "validación" a "productividad analítica" afecta el tipo de afirmaciones que pueden formularse con compromiso
- **Puede ejecutarse EN PARALELO con** los planes 06 (marcadores) y 07 (redundancias) si se coordinan archivos
