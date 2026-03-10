# Plan de Revisión: Omisión de la IA Encarnada y la Robótica

**Fecha**: 10 de marzo de 2026
**Prioridad**: Mayor — debería resolverse
**Secciones afectadas**: Capítulos 4 (Fundamentos II) y 5 (Marco de Resistencia Encarnada)
**Esfuerzo estimado**: Alto (requiere nueva subsección sustantiva + ajustes en el marco)

---

## 1. Diagnóstico del problema

### Descripción

La tesis asume que la IA carece de cuerpo como condición permanente, sin considerar la robótica blanda, los modelos sensoriomotores y la IA encarnada (*embodied AI*) como contraargumento. Esto deja la tipología tripartita de limitaciones (contingentes, arquitectónicas, ontológicas) vulnerable: si un robot puede tener propiocepción artificial, sensores de fuerza y bucles sensoriomotores en tiempo real, ¿dónde queda la frontera entre lo "contingente" y lo "arquitectónico"?

### Por qué es grave

- Los tres revisores del Cap. 4 coinciden en que es la omisión más grave del capítulo
- Sin abordar este contraargumento, la tesis ignora una línea entera de investigación directamente relevante (Brooks, Pfeifer, Di Paolo, Froese, Cuan, robótica de danza 2020–2025)
- Un tribunal con miembro de robótica o IA podría explotar esta laguna sistémicamente
- El argumento "la IA no tiene cuerpo" se convierte en hombre de paja si no se confronta con la IA que *sí* tiene cuerpo

### Dónde se manifiesta

| Capítulo | Problema | Ubicación específica |
|----------|----------|---------------------|
| 4-Fundamentos II | La exposición técnica de IA no menciona robótica, IA encarnada ni modelos sensoriomotores; la tipología de limitaciones no considera robots con propiocepción | §4.2.1 (modelos IAG), §4.2.2 (brecha de comprensión) |
| 5-Marco | Las dimensiones del marco asumen IA desencarnada; la D1 (cognición) no contempla robots con bucles sensoriomotores | §5.2.1 (dimensión cognición), §5.1 (arquitectura) |

---

## 2. Estrategia de resolución

### Principio rector

**No negar que la IA encarnada es un avance significativo; argumentar que la encarnación robótica no equivale al *Leib* fenomenológico.** La estrategia es reconocer la IA encarnada como desafío legítimo, distinguir entre *Körper*-like embodiment (acoplamiento sensorimotor físico) y *Leib* (normatividad intrínseca, historia ontogenética, participación sociocultural), y mostrar que la robótica de danza actual logra lo primero sin alcanzar lo segundo.

### Argumento central (en 4 pasos)

#### Paso 1: Reconocer la IA encarnada como avance real

Conceder explícitamente que la tradición Brooks–Pfeifer–Di Paolo ha demostrado que:
- La inteligencia robusta requiere acoplamiento sensorimotor con el entorno real (Brooks, 1991: "Intelligence without Representation")
- La morfología corporal participa en la "computación": la forma del cuerpo simplifica problemas de control (Pfeifer & Bongard, 2006: computación morfológica)
- La encarnación no es un lujo sino un requisito para ciertos tipos de inteligencia (Brooks, 1990: "Elephants Don't Play Chess")

**Fuente de investigación**: DR 1.3 (§§ sobre Brooks, Pfeifer/Bongard) — contiene citas textuales y argumentos detallados.

#### Paso 2: Distinguir encarnación-*Körper* de encarnación-*Leib*

El argumento clave: los robots de danza actuales logran *Körper-like embodiment* (un cuerpo físico con sensores y actuadores en bucle cerrado) pero no *Leib* (experiencia vivida con normatividad intrínseca). La diferencia se articula en cuatro componentes:

1. **Normatividad intrínseca y auto-mantenimiento precario**: Los enactivistas (Di Paolo, 2005; Froese & Ziemke, 2009) vinculan el sentido-hacimiento (*sense-making*) a la auto-mantenimiento adaptativo bajo condiciones de viabilidad. Los robots de danza no están organizados alrededor de auto-producción o supervivencia; sus "metas" son asignadas externamente.

2. **Historia habitual y "arco intencional"**: En Merleau-Ponty, la acción hábil es una sedimentación de la práctica pasada en la disponibilidad perceptivo-motora presente. Los robots almacenan datos y actualizan políticas, pero el "hábito" fenomenológico no es mera memoria: es una historia que reorganiza saliencias, affordances y posibilidades sentidas.

3. **Afectividad e interocepción como valoración vivida**: La danza no es solo cinemática; es esfuerzo, temporización, respiración, riesgo y sintonización afectiva. Un array de sensores puede registrar estados internos, pero la pregunta relevante es si esos estados funcionan como limitaciones vividas en primera persona que reconfiguran el mundo del agente.

4. **Inserción sociocultural y reconocimiento participativo**: Incluso si un robot lograra movimiento impresionante y responsividad, la "práctica dancística" implica pertenecer a comunidades, tradiciones, linajes de formación, géneros e instituciones.

**Fuente de investigación**: DR 1.3 (§ "Why sophisticated embodied AI still struggles to reach phenomenological Leib") — contiene exactamente estos 4 componentes con referencias.

#### Paso 3: Examinar la robótica de danza contemporánea (2020–2025)

Mostrar evidencia concreta de lo que la robótica de danza logra y no logra:

- **Thörn, Knudsen & Saffiotti (2020)**: Danza robot improvisada en RO-MAN — mediación por sistema de "estados artísticos", no autonomía dancística genuina
- **Catie Cuan (2021, 2024)**: "Breathless" — 8 horas de performance humano-robot con UR5e; coreografía construida desde análisis de video humano + teach mode. Demuestra que la coreografía de robot depende de autoría coreográfica humana insertada en el pipeline
- **Boston Dynamics Choreographer**: Secuencias scripted en timeline; demuestra que "danza robot" es ingeniería de movimiento, no práctica cultural autónoma
- **Wallace, Glette & Szorkovszky (2025)**: Survey en Frontiers señala gaps principales: planificación de movimiento en tiempo real, aprendizaje interactivo, dependencia morfológica, latencia, y la dificultad de evaluar "expresividad"

**Patrón general**: Los sistemas logran resultados convincentes al (i) scriptar movimiento, (ii) restringir partes del cuerpo, (iii) depender de trabajo coreográfico humano, y (iv) tratar la danza como dominio de demostración, no como práctica cultural auto-motivada.

**Fuente de investigación**: DR 1.3 (§ "Dance robotics and movement-art projects from the 2020–2025 period") — contiene todos estos proyectos con citas.

#### Paso 4: Reformular la tipología de limitaciones

La frontera contingente/arquitectónico necesita refinamiento:

- **Lo contingente** en la robótica de danza incluye: latencia, resolución de sensores, bandwidth de actuadores, rango de movimiento limitado — cosas que mejorarán con ingeniería
- **Lo arquitectónico** se desplaza: ya no es "la IA no tiene cuerpo" sino "la IA encarnada no tiene normatividad intrínseca, historia ontogenética ni inserción sociocultural"
- **Lo ontológico** se refuerza: la distinción *Körper*/*Leib* no depende de si hay cuerpo, sino de si hay experiencia vivida con sentido intrínseco

**Formulación tesis-ready**: "La práctica dancística implica centralmente *Leiblichkeit* (ser-corporal-vivido-con-otros en mundos histórica y culturalmente organizados), y la IA encarnada actual produce principalmente encarnación tipo-*Körper* más responsividad interaccional parcial, sin la normatividad intrínseca y la sedimentación socio-histórica que constituyen la práctica de danza."

---

## 3. Plan de implementación

### Intervención 1: Nueva subsección en Cap. 4 — "IA encarnada y robótica de danza"

**Ubicación**: Después de §4.2.2 (brecha de comprensión), antes de §4.3 (síntesis)
**Extensión**: ~1.500–2.000 palabras
**Contenido**:
1. Reconocimiento de la tradición de IA encarnada (Brooks, Pfeifer, Di Paolo) — ~400 palabras
2. Distinción Körper-embodiment vs Leib-embodiment (los 4 componentes) — ~600 palabras
3. Evidencia de robótica de danza 2020–2025 (Cuan, Thörn, BD, survey) — ~500 palabras
4. Reformulación de la frontera contingente/arquitectónico — ~300 palabras

**Tono**: Concesivo y riguroso. No defensivo. "La tradición de IA encarnada ha demostrado X; sin embargo, los cuatro componentes del *Leib* fenomenológico no se satisfacen con acoplamiento sensorimotor..."

### Intervención 2: Ajuste en la dimensión D1 del Cap. 5

**Ubicación**: §5.2.1 (dimensión cognición encarnada)
**Extensión**: ~400–600 palabras (inserción)
**Contenido**: Párrafo que reconoce que la D1 no presupone IA desencarnada; la resistencia cognitiva operaría incluso ante robots con propiocepción, porque D1 mide la dependencia de normatividad intrínseca y sensorimotor mastery vivido, no simplemente de acoplamiento físico.

### Intervención 3: Nota en la arquitectura del marco (§5.1)

**Ubicación**: §5.1 (arquitectura general)
**Extensión**: ~200 palabras (inserción)
**Contenido**: Aclaración de que el marco no presupone IA exclusivamente software/texto; las dimensiones aplican también a IA encarnada, evaluando grados de encarnación fenomenológica (no solo física).

### Intervención 4: Ajuste en la tipología de §4.1 o §4.2

**Ubicación**: Donde se presenta la tipología contingente/arquitectónico/ontológico
**Extensión**: ~300 palabras (reformulación)
**Contenido**: Refinar las fronteras: lo contingente incluye limitaciones de hardware robótico; lo arquitectónico refiere a la ausencia de organización autopoiética; lo ontológico refiere a la ausencia de *Leib* como experiencia vivida con normatividad.

---

## 4. Referencias clave a incorporar

| Referencia | Uso en la revisión |
|------------|-------------------|
| Brooks, R. A. (1991). Intelligence without representation. *Artificial Intelligence, 47*(1–3), 139–159. | Fundamentar concesión: inteligencia requiere encarnación |
| Pfeifer, R., & Bongard, J. (2006). *How the body shapes the way we think*. MIT Press. | Computación morfológica; la forma del cuerpo importa |
| Di Paolo, E. A. (2005). Autopoiesis, adaptivity, teleology, agency. *Phenomenology and the Cognitive Sciences, 4*, 429–452. | Normatividad intrínseca como criterio diferenciador |
| Froese, T., & Ziemke, T. (2009). Enactive artificial intelligence. *Artificial Intelligence, 173*(3–4), 466–500. | Programa enactivo: desafío + barra alta |
| Froese, T., & Taguchi, S. (2019). The problem of meaning in AI and robotics. *Philosophies, 4*(2), 14. | El problema del significado intrínseco persiste |
| Cuan, C. (2021). Dances with robots. *TDR, 65*(1), 124–143. | Caso empírico: práctica reflexiva humano-robot |
| Cuan, C., Qiu, T., Ganti, S., & Goldberg, K. (2024). Breathless. ISRR preprint. | Caso empírico: limitaciones de UR5e |
| Thörn, O., Knudsen, P., & Saffiotti, A. (2020). Human-robot artistic co-creation. RO-MAN 2020. | Caso empírico: improvisación mediada |
| Wallace, B., Glette, K., & Szorkovszky, A. (2025). How can we make robot dance expressive? *Frontiers in Computer Science, 7*. | Survey estado del arte |
| De Jaegher, H., & Di Paolo, E. A. (2007). Participatory sense-making. *Phenomenology and the Cognitive Sciences, 6*(4), 485–507. | Sentido participativo como criterio |

---

## 5. Criterios de completitud

- [ ] Se reconoce la IA encarnada como avance legítimo (no hombre de paja)
- [ ] Se distinguen claramente 4 componentes del *Leib* que la robótica actual no satisface
- [ ] Se presentan al menos 3 proyectos concretos de robótica de danza (2020–2025)
- [ ] Se reformula la tipología contingente/arquitectónico con la nueva distinción
- [ ] La D1 del marco ya no presupone IA desencarnada
- [ ] Las referencias clave están integradas en la bibliografía
- [ ] El argumento no es defensivo/esencialista sino concesivo y riguroso

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| La subsección se convierte en catálogo técnico sin hilo argumentativo | Estructurar alrededor de la pregunta: "¿es la encarnación robótica equivalente al *Leib*?" |
| Parecer que se acepta que la IA encarnada "eventualmente" resolverá el problema | Formular claramente que el argumento es sobre organización (autopoiesis, normatividad), no sobre ingeniería incremental |
| Extensión excesiva que desequilibra el Cap. 4 | Máximo 2.000 palabras; usar tabla comparativa para sintetizar |
| Ignorar el argumento de Di Paolo sobre uso de modelos sintéticos | Incluir explícitamente la posición de Di Paolo/Froese: construir modelos no refuta la tesis, clarifica qué faltaría |
