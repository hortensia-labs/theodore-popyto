# Plan de Revisión: Redundancias Expositivas

**Fecha**: 10 de marzo de 2026
**Prioridad**: Mayor — debería resolverse
**Secciones afectadas**: Capítulos 1, 3, 4, 5, 6
**Esfuerzo estimado**: Medio (requiere lectura cuidadosa y condensación, no contenido nuevo)

---

## 1. Diagnóstico del problema

### Descripción

El argumento de que "la IA carece de experiencia corporal vivida" aparece en al menos siete variaciones en el Cap. 3 y se reitera en los capítulos 4, 5 y 6. La salvaguarda metodológica del Cap. 4 se cita textualmente en múltiples ubicaciones. Las transiciones entre dimensiones del Cap. 5 repiten sistemáticamente lo establecido. Reducción estimada total: 4.000–6.000 palabras sin pérdida de contenido conceptual.

### Patrones de redundancia identificados

| Patrón | Capítulos | Problema |
|--------|-----------|----------|
| **"La IA carece de experiencia corporal vivida"** | 3, 4, 5, 6 | El mismo argumento reformulado en múltiples variaciones (~7 veces solo en Cap. 3); cada repetición añade retórica pero no nuevo contenido |
| **Salvaguarda metodológica** | 4, 5, 6 | La salvaguarda del Cap. 4 (subordinación de la tarea al *Leib*) se cita textualmente o se parafrasea en múltiples ubicaciones |
| **Transiciones inter-dimensiones en Cap. 5** | 5 | Cada sección de dimensión (D1–D4) abre recapitulando lo establecido en la dimensión anterior y en la arquitectura general |
| **Subsecciones "Implicaciones para la IA"** | 3 | Cada pilar (cognición, estética, poética) tiene una subsección de "implicaciones para la IA" que repite la estructura argumental básica |
| **Recapitulaciones introductorias** | 1, 3, 4, 5, 6 | Párrafos de apertura de capítulos que recapitulan demasiado extensamente lo anterior |

### Por qué es problemático

- La tesis ya es extensa (~76K palabras); las redundancias añaden ~4.000–6.000 palabras sin contenido nuevo
- La repetición del argumento central puede paradójicamente debilitarlo: da la impresión de que el autor necesita repetir para convencer
- Las transiciones repetitivas ralentizan la lectura y diluyen la densidad argumentativa
- Un tribunal puede señalar que "este argumento ya se hizo" o "esto es repetitivo"
- Las "Implicaciones para la IA" en Cap. 3 anticipan el marco del Cap. 5 de manera redundante

---

## 2. Estrategia de resolución

### Principio rector

**Reducir la repetición sin perder la coherencia argumentativa ni las transiciones necesarias.** El objetivo es que cada idea aparezca en su ubicación óptima (donde tiene mayor peso argumentativo) y que las demás instancias se reemplacen por referencias cruzadas breves o se eliminen.

### Reglas de operación

1. **Primera instancia = desarrollo completo**: el argumento se desarrolla plenamente donde aparece por primera vez o donde tiene mayor peso lógico
2. **Instancias subsiguientes = referencia + aporte nuevo**: si el argumento se repite, solo se conserva si añade algo nuevo (matiz, aplicación, contraste); de lo contrario se reemplaza por referencia cruzada
3. **Transiciones**: se conservan pero se condensan — máximo 2 oraciones de recapitulación antes de avanzar
4. **Objetivo cuantitativo**: reducir ~4.000–5.000 palabras totales

---

## 3. Plan de implementación

### Fase 1: Mapeo de redundancias

**Acción**: Para cada patrón identificado, localizar todas las instancias en los archivos de contenido.

#### Patrón A: "La IA carece de experiencia corporal vivida"

Buscar variaciones del argumento central:
```
grep -rn "experiencia.*corporal\|cuerpo vivido\|Leib.*IA\|IA.*carece\|automatizaci.*cuerpo\|irreducible.*computa" sections/*/content/*.md
```

**Ubicación óptima**: §3.1.1 (donde se introduce la distinción *Körper*/*Leib*) y §5.1 (donde se opera como premisa del marco). Las demás instancias deben referir a estas.

#### Patrón B: Salvaguarda metodológica

Buscar la salvaguarda:
```
grep -rn "salvaguarda\|subordina.*tarea.*Leib\|tarea.*subordina" sections/*/content/*.md
```

**Ubicación óptima**: §4.3 (síntesis Leib-tarea). Las demás instancias deben referir aquí.

#### Patrón C: Transiciones inter-dimensiones en Cap. 5

Revisar los párrafos de apertura de:
- §5.2.1 (D1 - cognición)
- §5.2.2 (D2 - trabajo)
- §5.2.3 (D3 - valor)
- §5.2.4 (D4 - poética)

Evaluar cuántas palabras se dedican a recapitular vs. a avanzar.

#### Patrón D: Subsecciones "Implicaciones para la IA" en Cap. 3

Revisar las subsecciones finales de cada pilar en Cap. 3. Evaluar qué contenido es:
- **Anticipación útil** del Cap. 5 (conservar en forma condensada)
- **Repetición del argumento central** (eliminar o reducir)

#### Patrón E: Recapitulaciones introductorias

Revisar los párrafos de apertura de Caps. 3, 4, 5, 6. Evaluar extensión de la recapitulación.

### Fase 2: Decisión por instancia

Para cada instancia redundante, decidir entre:

| Acción | Cuándo usarla |
|--------|---------------|
| **Conservar íntegramente** | Primera aparición o ubicación con mayor peso argumentativo |
| **Condensar** | La instancia añade un matiz o perspectiva nueva, pero repite demasiado contexto |
| **Reemplazar por referencia** | La instancia no añade nada nuevo; se reemplaza por "como se argumentó en §X.Y" |
| **Eliminar** | La instancia es redundante y su eliminación no afecta la coherencia del párrafo |

### Fase 3: Intervención por capítulo

#### Cap. 3 (prioridad alta — mayor concentración de redundancias)

**Archivo(s)**: `sections/3-fundamentos-1/content/*.md`

1. Revisar §3.1.1 (Körper/Leib): asegurar que el argumento está completo aquí
2. Condensar las "Implicaciones para la IA" de cada pilar: reducir cada una de ~300–500 palabras a ~100–150 palabras que señalen la conexión con el Cap. 5 sin duplicar el argumento
3. Revisar §3.4 (síntesis): eliminar repeticiones del argumento central que ya estén en §3.1.1

**Reducción estimada**: ~1.500–2.000 palabras

#### Cap. 5 (prioridad alta)

**Archivo(s)**: `sections/5-marco-resistencia/content/*.md`

1. Condensar transiciones inter-dimensiones: cada apertura de dimensión → máximo 2 oraciones de enlace
2. Verificar que §5.1 (arquitectura) contiene el argumento central sin repetirlo innecesariamente
3. Eliminar paráfrasis de la salvaguarda metodológica; reemplazar por referencia a §4.3

**Reducción estimada**: ~1.000–1.500 palabras

#### Cap. 4 (prioridad media)

**Archivo(s)**: `sections/4-fundamentos-2/content/*.md`

1. Asegurar que la salvaguarda metodológica tiene su formulación definitiva en §4.3
2. Eliminar repeticiones de la salvaguarda en otras subsecciones del Cap. 4

**Reducción estimada**: ~500–800 palabras

#### Cap. 6 (prioridad media)

**Archivo(s)**: `sections/6-discusion/content/*.md`

1. Condensar las recapitulaciones del marco al inicio de cada viñeta
2. Eliminar repeticiones del argumento "la IA carece de cuerpo vivido" — a esta altura del texto, el lector ya lo sabe
3. Condensar secciones de implicaciones (§6.2.x) donde sean genéricas y formulables sin el marco

**Reducción estimada**: ~800–1.200 palabras

#### Cap. 1 (prioridad baja)

**Archivo(s)**: `sections/1-introduccion/content/*.md`

1. Evaluar si la justificación del enfoque (~1.600 palabras señaladas como "defensivas" por el informe) puede condensarse

**Reducción estimada**: ~300–500 palabras

### Fase 4: Verificación de coherencia

Después de todas las reducciones:
1. Releer cada capítulo completo para verificar que las transiciones fluyen
2. Verificar que no se han eliminado distinciones o matices importantes
3. Verificar que las referencias cruzadas son correctas
4. Recompilar la tesis (`make merge-all-r`) y revisar el flujo del documento completo

---

## 4. Criterios de completitud

- [ ] Mapa de redundancias completado (todas las instancias identificadas)
- [ ] Cada instancia clasificada (conservar/condensar/referencia/eliminar)
- [ ] Cap. 3 intervenido (reducción ~1.500–2.000 palabras)
- [ ] Cap. 5 intervenido (reducción ~1.000–1.500 palabras)
- [ ] Cap. 4 intervenido (reducción ~500–800 palabras)
- [ ] Cap. 6 intervenido (reducción ~800–1.200 palabras)
- [ ] Cap. 1 intervenido (reducción ~300–500 palabras)
- [ ] Reducción total verificada: ≥4.000 palabras
- [ ] Coherencia verificada: transiciones fluyen, no se perdieron matices
- [ ] Compilación exitosa (`make merge-all-r`)

---

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Eliminar una instancia que aportaba un matiz no disponible en otra parte | Leer siempre el contexto completo antes de eliminar; marcar "matices únicos" |
| Las referencias cruzadas crean dependencia de lectura secuencial | Asegurar que cada sección es autosuficiente para su argumento local; las referencias son para evitar redundancia, no para comprensión |
| La reducción excesiva hace que la tesis "salte" entre ideas | Mantener 1–2 oraciones de transición en cada punto donde se elimina contenido |
| Descoordinar las intervenciones con otras revisiones del round-2 | Ejecutar este plan DESPUÉS de las intervenciones de contenido nuevo (Caps. 3, 4, 5) para no reducir texto que luego se modificará |

---

## 6. Dependencias y orden de ejecución

Este plan tiene dependencias con otros planes del round-2:

1. **Ejecutar DESPUÉS de** los planes 01 (circularidad), 02 (funcionalismo), 03 (constructivismo/ontología), 04 (IA encarnada) — porque estos añaden contenido nuevo a Caps. 3, 4, 5
2. **Ejecutar ANTES de** el plan 06 (marcadores editoriales) — para que la verificación de marcadores se haga sobre el texto final
3. **Coordinar CON** el plan 09 (lagunas bibliográficas) — las nuevas referencias no deben introducir nuevas redundancias
