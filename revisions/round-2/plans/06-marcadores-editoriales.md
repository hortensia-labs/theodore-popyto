# Plan de Revisión: Marcadores Editoriales Sin Resolver

**Fecha**: 10 de marzo de 2026
**Prioridad**: Menor — solo 4 marcadores genuinos pendientes
**Secciones afectadas**: Capítulos 3 y 4 (no toda la tesis)
**Esfuerzo estimado**: Bajo — resolución puntual de 4 instancias

---

## 1. Diagnóstico del problema (actualizado con auditoría real)

### Hallazgo crítico: las referencias cruzadas NO son marcadores sin resolver

La auditoría automatizada reveló que las ~138 instancias de `[Paragraph Number & Page Number]` identificadas en el diagnóstico inicial **no son placeholders vacíos**. Son **referencias cruzadas correctamente formateadas** según el sistema de publicación de la tesis.

#### Cómo funciona el sistema de referencias cruzadas

Según la especificación técnica (`rules/cross-references.md`), la tesis utiliza un sistema de referencias cruzadas basado en indicadores (*anchors*) que se procesan automáticamente al compilar a ICML para InDesign:

**Estructura de una referencia cruzada:**

```
[FORMATO](#indicador-de-seccion)
```

Donde:

- El **texto entre corchetes** es el formato de renderizado (no texto literal visible en el PDF final)
- El **indicador entre paréntesis** apunta a un encabezado que declara ese anchor con `{#indicador}`

**Formatos disponibles:**

| Formato en markdown | Resultado en InDesign (PDF final) |
| --- | --- |
| `[Paragraph Number & Page Number](#indicador)` | "3.1 en pág. 43" |
| `[Enclosed Paragraph Number & Page Number](#indicador)` | "(3.1 en pág. 43)" |
| `[Page Number](#indicador)` | "pág. 43" |
| `[Enclosed Page Number](#indicador)` | "(pág. 43)" |

**Ejemplo real de la tesis:**

En el archivo `3.4-sintesis.md`, línea 43:

```markdown
...constituirá el núcleo de esa exploración [Paragraph Number & Page Number](#sintesis-leib-tarea).
```

Esto se renderizará en InDesign como: "...constituirá el núcleo de esa exploración **4.3 en pág. 87**." (donde 4.3 y 87 son el número de sección y página real que InDesign calcula automáticamente).

#### Declaración de indicadores (anchors)

Cada sección de la tesis declara su indicador en el encabezado con la sintaxis `{#nombre-indicador}`. Ejemplo:

```markdown
## 4.3. Síntesis Intermedia II: La Tensión Productiva entre el *Leib* y la "Tarea" {#sintesis-leib-tarea}
```

La tesis cuenta actualmente con **~190 indicadores declarados** distribuidos en todos los capítulos, proporcionando amplia cobertura para las referencias cruzadas.

#### Verificación: todas las referencias cruzadas tienen indicador asignado

La auditoría confirmó que **las 138 instancias** de `[Paragraph Number & Page Number]` incluyen un indicador `(#...)` válido. No hay ningún caso de referencia cruzada "huérfana" (sin indicador asignado):

```
# Resultado: 0 instancias sin indicador
grep -P '\[Paragraph Number & Page Number\](?!\(#)' → 0 resultados
```

**Conclusión**: estas 138 instancias son funcionales y NO requieren intervención.

### Marcadores genuinos pendientes: solo 4 instancias

Los únicos marcadores editoriales que requieren resolución son:

| # | Tipo | Archivo | Línea | Contenido |
| --- | --- | --- | --- | --- |
| 1 | `[PENDIENTE]` | `4-fundamentos-2/content/4.3-sintesis-leib-tarea.md` | 77 | Contenido por desarrollar (referencia al Cap. 5) |
| 2 | `[PENDIENTE]` | `4-fundamentos-2/content/4.2.2-brecha-comprension.md` | 75 | "ref Cap 5 - Las implicaciones ético-políticas aquí esbozadas se desarrollarán con mayor profundidad en el Capítulo 5" |
| 3 | `[REVISAR]` | `3-fundamentos-1/content/3.1.3-presencia-escenica.md` | 61 | "Posible solapamiento conceptual con sección 3.2.3 sobre presencia aurática - coordinar terminología" |
| 4 | `[REVISAR]` | `4-fundamentos-2/content/4.2.2-brecha-comprension.md` | 73 | "Esta sección integra material de tres sources diferentes (4-2, 4-3, 4-4). Verificar que las transiciones entre perspectivas (técnica, estética, ético-legal) sean fluidas." |

---

## 2. Estrategia de resolución

### Principio rector

**Resolución contextual, no mecánica.** Cada uno de los 4 marcadores requiere lectura del contexto circundante para decidir la acción correcta. No se trata de eliminar texto sino de resolver la cuestión subyacente.

### Protocolo por tipo de marcador

#### Tipo 1: `[PENDIENTE: ...]` (2 instancias)

Ambas instancias se refieren a contenido del Capítulo 5 que ya ha sido desarrollado. Para cada una:

1. **Leer el contexto** del párrafo que contiene el marcador
2. **Verificar** si el contenido referenciado existe en el Capítulo 5
3. **Decisión**:
   - Si el contenido ya existe → **reemplazar el marcador por una referencia cruzada** usando el formato del sistema: `[Paragraph Number & Page Number](#indicador-correspondiente)` o `[Enclosed Paragraph Number & Page Number](#indicador-correspondiente)`
   - Si el contenido aún no existe → desarrollar el contenido o eliminar la referencia y reformular

**Indicadores relevantes del Capítulo 5** para estas referencias:

- `#capitulo-5` — capítulo completo
- `#arquitectura-marco` — §5.1 Arquitectura general
- `#dimension-cognicion` — §5.2.1
- `#dimension-trabajo` — §5.2.2
- `#dimension-valor` — §5.2.3
- `#dimension-poetica` — §5.2.4
- `#lente-etico-politica` — §5.3 Dimensión ético-política
- `#analisis-poder` — §5.3.1
- `#problematizacion-frontera` — §5.3.2
- `#codificable-valor` — §5.3.3

#### Tipo 2: `[REVISAR: ...]` (2 instancias)

Para cada instancia:

1. **Leer el pasaje marcado** y el texto indicado en la nota
2. **Evaluar la cuestión señalada**:
   - Instancia #3 (solapamiento terminológico §3.1.3 vs §3.2.3): comparar ambas secciones, verificar si la terminología sobre "presencia" es coherente, y ajustar si hay conflicto
   - Instancia #4 (transiciones en §4.2.2): releer la sección completa evaluando la fluidez de las transiciones entre las tres perspectivas
3. **Si la cuestión está resuelta**: eliminar el marcador
4. **Si requiere ajuste**: realizar el ajuste y luego eliminar el marcador

---

## 3. Plan de implementación

### Paso 1: Resolver los 2 `[PENDIENTE]` del Capítulo 4

**Archivos a modificar:**

- `sections/4-fundamentos-2/content/4.3-sintesis-leib-tarea.md` (línea 77)
- `sections/4-fundamentos-2/content/4.2.2-brecha-comprension.md` (línea 75)

**Acción**: Leer cada marcador en contexto → verificar que el contenido referenciado exista en Cap. 5 → reemplazar por referencia cruzada formal o reformular.

### Paso 2: Resolver los 2 `[REVISAR]` de los Capítulos 3 y 4

**Archivos a modificar:**

- `sections/3-fundamentos-1/content/3.1.3-presencia-escenica.md` (línea 61)
- `sections/4-fundamentos-2/content/4.2.2-brecha-comprension.md` (línea 73)

**Acción**: Evaluar cada cuestión señalada → realizar ajustes si son necesarios → eliminar marcador.

### Paso 3: Verificación final

Ejecutar búsqueda automatizada para confirmar cero marcadores residuales:

```bash
# Verificar que no quedan marcadores editoriales
grep -rn "\[PENDIENTE" sections/*/content/*.md
grep -rn "\[REVISAR" sections/*/content/*.md
grep -rn "\[TODO" sections/*/content/*.md
grep -rn "\[XXX" sections/*/content/*.md
grep -rn "\[NOTA\]" sections/*/content/*.md
```

**Nota**: NO buscar `[Paragraph Number & Page Number]` ni `[Enclosed Paragraph Number & Page Number]` — estos son referencias cruzadas funcionales del sistema de publicación, no marcadores pendientes.

---

## 4. Referencia técnica: Sistema de referencias cruzadas

Esta sección documenta el sistema completo para que el implementador pueda crear nuevas referencias cruzadas si es necesario al resolver los marcadores `[PENDIENTE]`.

### Sintaxis de referencia cruzada

```markdown
[FORMATO](#indicador-de-seccion)
```

### Formatos disponibles

| Formato | Resultado en PDF | Uso recomendado |
| --- | --- | --- |
| `[Paragraph Number & Page Number](#id)` | "3.1 en pág. 43" | Referencia estándar en el cuerpo del texto |
| `[Enclosed Paragraph Number & Page Number](#id)` | "(3.1 en pág. 43)" | Referencia entre paréntesis (aclaratoria) |
| `[Page Number](#id)` | "pág. 43" | Cuando solo importa la página |
| `[Enclosed Page Number](#id)` | "(pág. 43)" | Página entre paréntesis |

### Sintaxis de declaración de indicador (anchor)

```markdown
## Título de la Sección {#nombre-del-indicador}
```

- Se declara al final del encabezado, entre llaves
- Sin espacios dentro de las llaves
- Comienza con `#`
- Usa guiones para separar palabras (kebab-case)

### Ejemplos de aplicación correcta

**Referencia estándar en línea:**

```markdown
...constituirá el núcleo de esa exploración [Paragraph Number & Page Number](#sintesis-leib-tarea).
```

→ Resultado: "...constituirá el núcleo de esa exploración 4.3 en pág. 87."

**Referencia parentética:**

```markdown
Como hemos visto en la sección sobre complementariedad [Enclosed Paragraph Number & Page Number](#aumento-complementariedad), la resistencia encarnada no implica rechazo tecnófobo.
```

→ Resultado: "Como hemos visto en la sección sobre complementariedad (4.1.3 en pág. 62), la resistencia encarnada no implica rechazo tecnófobo."

**Patrón para reemplazar un `[PENDIENTE: ref Cap X]`:**

Antes:

```markdown
[PENDIENTE: ref Cap 5 - Las implicaciones ético-políticas se desarrollarán en el Capítulo 5.]
```

Después:

```markdown
Las implicaciones ético-políticas aquí esbozadas se desarrollan con mayor profundidad en el análisis del marco "Resistencia Encarnada" [Enclosed Paragraph Number & Page Number](#lente-etico-politica).
```

### Inventario de indicadores disponibles (por capítulo)

Para facilitar la resolución de los `[PENDIENTE]`, se incluye el listado completo de indicadores agrupados por capítulo.

#### Capítulo 1: Introducción

- `#contexto-gran-dislocacion` — §1.1
- `#planteamiento-problema` — §1.2
- `#danza-caso-limite` — §1.2.1
- `#doble-vacio` — §1.2.2
- `#justificacion-enfoque` — §1.3
- `#pregunta-hipotesis` — §1.4
- `#objetivos` — §1.5
- `#relevancia` — §1.6
- `#estructura-tesis` — §1.7

#### Capítulo 2: Metodología

- `#enfoque-metodologia` — §2.1
- `#paradigma-constructivista` — §2.1
- `#fases-desarrollo` — §2.2
- `#fase-rsl` — §2.2.1
- `#fase-analisis` — §2.2.2
- `#fase-sintesis` — §2.2.3
- `#analisis-estratificado` — §2.3
- `#modelo-estratificado` — §2.3
- `#tensiones-productivas` — §2.3
- `#tipologia-tensiones` — §2.3
- `#metodologia-vinetas` — §2.4
- `#poder-heuristico-criterio` — §2.4
- `#criterios-fracaso` — §2.4
- `#validacion-vinetas-criterios` — §2.4
- `#limitaciones-metodologicas` — §2.5
- `#posicionalidad-investigador` — §2.5

#### Capítulo 3: Fundamentos Teóricos I

- `#cap3-introduccion` — Cap. 3 intro
- `#cognicion-corporeizada` — §3.1
- `#cuerpo-conocimiento` — §3.1.1
- `#korper-leib` — §3.1.1
- `#criterios-independientes-leib` — §3.1.1
- `#cuerpo-vivido` — §3.1.1
- `#esquema-corporal` — §3.1.1
- `#paradigmas-rivales` — §3.1.1b
- `#argumento-autopoietico` — §3.1.1b
- `#dimension-receptiva` — §3.1.1b
- `#contingencia-funcionalismo` — §3.1.1b
- `#conocimiento-tacito` — §3.1.2
- `#polanyi-tacito` — §3.1.2
- `#inteligencia-kinestetica` — §3.1.2
- `#memoria-muscular` — §3.1.2
- `#juicio-encarnado` — §3.1.2
- `#presencia-escenica` — §3.1.3
- `#enaccion` — §3.1.3
- `#acoplamiento-estructural` — §3.1.3
- `#sense-making` — §3.1.3
- `#percepcion-activa` — §3.1.3
- `#propiocepcion` — §3.1.3
- `#estetica-valor` — §3.2
- `#intencionalidad-artistica` — §3.2.1
- `#juicio-estetico` — §3.2.1
- `#subjetividad-creador` — §3.2.1
- `#autenticidad-performativa` — §3.2.1
- `#expresividad-emocional` — §3.2.1
- `#co-construccion-significado` — §3.2.2
- `#recepcion-estetica` — §3.2.2
- `#horizonte-expectativas` — §3.2.2
- `#empatia-kinestetica` — §3.2.2
- `#valor-finitud` — §3.2.3
- `#presencia-auratica` — §3.2.3
- `#vulnerabilidad` — §3.2.3
- `#fragilidad-performance` — §3.2.3
- `#efimeridad` — §3.2.3
- `#poetica-danza` — §3.3
- `#lenguaje-movimiento` — §3.3.1
- `#analisis-laban` — §3.3.1
- `#kinesfera` — §3.3.1
- `#polisemia-danza` — §3.3.1
- `#metafora-kinestetica` — §3.3.1
- `#improvisacion-composicion` — §3.3.2
- `#improvisacion-danza` — §3.3.2
- `#pensamiento-movimiento` — §3.3.2
- `#composicion-coreografica` — §3.3.2
- `#dramaturgia-danza` — §3.3.2
- `#anclaje-cultural` — §3.3.3
- `#cuerpo-archivo` — §3.3.3
- `#transmision-cultural` — §3.3.3
- `#resistencia-social` — §3.3.3
- `#sintesis-cap3` — §3.4
- `#convergencias-pilares` — §3.4
- `#irreductiblemente-humano` — §3.4
- `#definicion-irreductible` — §3.4
- `#barrera-ia-cap3` — §3.4

#### Capítulo 4: Fundamentos Teóricos II

- `#cap4-introduccion` — Cap. 4 intro
- `#pilar-economia-laboral` — §4.1
- `#tareas-rutinarias-no-rutinarias` — §4.1.1
- `#desagregacion-profesiones-danza` — §4.1.2
- `#matriz-alm` — §4.1.2
- `#aumento-complementariedad` — §4.1.3
- `#inteligencia-artificial-generativa` — §4.2
- `#modelos-iag-actuales` — §4.2.1
- `#brecha-comprension` — §4.2.2
- `#implicaciones-etico-juridicas` — §4.2.2
- `#ia-encarnada-robotica` — §4.2.3
- `#sintesis-leib-tarea` — §4.3
- `#tipologia-tres-niveles` — §4.3

#### Capítulo 5: Marco "Resistencia Encarnada"

- `#capitulo-5` — Cap. 5
- `#arquitectura-marco` — §5.1
- `#definicion-marco` — §5.1.1
- `#proposito-marco` — §5.1.2
- `#funciones-marco` — §5.1.3
- `#funcion-analitica` — §5.1.3
- `#funcion-propositiva` — §5.1.3
- `#componentes-marco` — §5.1.4
- `#justificacion-arquitectura` — §5.1.5
- `#pilares-interaccion` — §5.2
- `#dimension-cognicion` — §5.2.1
- `#brecha-ontologica` — §5.2.1
- `#definicion-dim1` — §5.2.1
- `#dimension-trabajo` — §5.2.2
- `#definicion-dim2` — §5.2.2
- `#dimension-valor` — §5.2.3
- `#sintaxis-semantica` — §5.2.3
- `#definicion-dim3` — §5.2.3
- `#dimension-poetica` — §5.2.4
- `#capital-simbolico` — §5.2.4
- `#guardianes-institucionales` — §5.2.4
- `#definicion-dim4` — §5.2.4
- `#lente-etico-politica` — §5.3
- `#analisis-poder` — §5.3.1
- `#neutralidad-tecnologica` — §5.3.1
- `#cui-bono` — §5.3.1
- `#problematizacion-frontera` — §5.3.2
- `#frontera-construida` — §5.3.2
- `#posthumanismo` — §5.3.2
- `#realismo-critico` — §5.3.2
- `#codificable-valor` — §5.3.3
- `#valor-oficio` — §5.3.3
- `#revalorizacion-tecnica` — §5.3.3
- `#interrelaciones` — §5.4
- `#sistema-dinamico` — §5.4
- `#aplicacion-marco` — §5.4
- `#limitaciones-marco` — §5.4
- `#representacion-visual` — §5.5

#### Capítulo 6: Discusión

- `#capitulo-6` — Cap. 6
- `#intro-cap6` — Cap. 6 intro
- `#validacion-vinetas` — §6.1
- `#intro-vinetas` — §6.1
- `#vineta-ballet` — §6.1.1 (Viñeta A)
- `#vineta-coreografia` — §6.1.2 (Viñeta B)
- `#vineta-posthumano` — §6.1.3 (Viñeta C)
- `#sintesis-vinetas` — §6.1.4
- `#patrones-vinetas` — §6.1.4
- `#poder-heuristico` — §6.1.4
- `#refinamientos` — §6.1.4
- `#caso-dificil-tiktok` — §6.1.4
- `#implicaciones-marco` — §6.2
- `#implicaciones-investigacion` — §6.2.1
- `#implicaciones-artistas` — §6.2.2
- `#implicaciones-formacion` — §6.2.3
- `#implicaciones-politicas` — §6.2.4
- `#autocritica` — §6.3
- `#fortalezas-marco` — §6.3.1
- `#limitaciones-marco` — §6.3.2
- `#futuras-iteraciones` — §6.3.3

#### Capítulo 7: Conclusiones

- `#recapitulacion-objetivos` — §7.1
- `#tabla-objetivos-cumplimiento` — §7.1
- `#contribucion-principal` — §7.2
- `#modelo-transferible` — §7.2
- `#lente-etico-politica-contribucion` — §7.2
- `#implicaciones-generales` — §7.3
- `#creatividad-encarnada` — §7.3
- `#socio-hermeneutico-general` — §7.3
- `#lineas-futuras` — §7.4
- `#lineas-empiricas` — §7.4
- `#lineas-teoricas` — §7.4
- `#consideraciones-finales` — §7.5
- `#danza-del-futuro` — §7.5

#### Anexos

- `#anexo-plantilla-analisis` — Anexo A

---

## 5. Criterios de completitud

- [ ] Los 2 `[PENDIENTE]` del Capítulo 4 resueltos (reemplazados por referencias cruzadas o reformulados)
- [ ] Los 2 `[REVISAR]` de los Capítulos 3 y 4 evaluados y eliminados
- [ ] Verificación automatizada confirma cero marcadores `[PENDIENTE]`, `[REVISAR]`, `[TODO]`, `[XXX]` restantes
- [ ] Reformulaciones revisadas para naturalidad del texto
- [ ] Las referencias cruzadas `[Paragraph Number & Page Number](#...)` NO han sido alteradas

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Confundir referencias cruzadas funcionales con marcadores sin resolver | **CRÍTICO**: `[Paragraph Number & Page Number](#indicador)` es sintaxis funcional del sistema de publicación. NUNCA modificar ni eliminar estas referencias. Solo intervenir en `[PENDIENTE]` y `[REVISAR]` |
| Los `[PENDIENTE]` referencian contenido que aún no existe en Cap. 5 | Verificar existencia del contenido antes de crear la referencia cruzada; si no existe, reformular sin referencia |
| El `[REVISAR]` sobre solapamiento terminológico revela un problema real | Leer ambas secciones (§3.1.3 y §3.2.3) antes de decidir; si hay solapamiento, coordinar terminología en ambas |
| Nuevos marcadores introducidos por otras revisiones del round-2 | Ejecutar verificación final (Paso 3) después de completar TODAS las revisiones |

---

## 7. Dependencias

Este plan puede ejecutarse **en paralelo** con la mayoría de las otras revisiones del round-2, dado que solo afecta 4 líneas en 3 archivos. Sin embargo:

- La verificación final (Paso 3) debe ejecutarse **después** de completar todas las revisiones, para capturar cualquier marcador nuevo introducido por otras intervenciones
- Si otras revisiones modifican los archivos `4.3-sintesis-leib-tarea.md`, `4.2.2-brecha-comprension.md` o `3.1.3-presencia-escenica.md`, coordinar para evitar conflictos
