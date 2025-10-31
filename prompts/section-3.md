Fantástico! Comencemos a trabajar en esta sección. Para ello usaremos un agente LLM con una ventana de contexto amplia que pueda llevar a cabo esta tarea a la perfección.

La tarea consiste en construir el cuerpo final de cada subsección a partir de su esbozo, mi descripción, tu comprensión de la sección, y el sentido de la sección dentro de la tesis.
Para construir el cuerpo de estas secciones deberemos hacerlo con el mismo rigor y la misma calidad de redacción que en las anteriores, aunque sea autoetnográfica, la redacción y la exposición de las ideas deberán mantener en todo momento el rigor académico que merecen en una tesis de nivel doctoral. Además, dicha redacción deberá contar con el formato y la fluidez necesaria para que el lector pueda seguir los contenidos de la manera más eficiente y cohesiva posible.
Por otro lado, como hay muchos conceptos explicados en otras secciones del marco teórico, podríamos también vincularlos a los mismos estableciendo referencias cruzadas. En estos documentos las referencias cruzadas de realizan de la siguiente manera:

- **indicadores**: cada título de sección o subsección cuenta con un indicador declarado entre llaves, sin espacios, y comenzando con el símbolo de número (e.j. {#indicador-de-la-seccion})
- **vínculos**: en el cuerpo, para establecer una referencia cruzada se pone entre corchetes el formato y seguido entre paréntesis el indicador al que hace referencia (e.j. [Paragraph Number & Page Number](#indicador-de-seccion) )

Los formatos de referencia cruzada disponibles son:

- **Paragraph Number & Page Number**: resulta en '3.1 en pág. 43'
- **Enclosed Paragraph Number & Page Number**: resulta en '(3.1 en pág. 43)'
- **Page Number**: resulta en 'pág. 43'
- **Enclosed Page Number**: resulta en '(pág. 43)'

Una cuestión importante a tener en cuenta en el proceso de redacción a partir del esbozo: la redacción final deberá ser lo más extensa y descriptiva posible, de manera que un lector sin conocimientos en el campo pueda comprender profundamente los conceptos y las ideas que se exponen evitando que quede lugar a ninguna duda.

Teniendo en cuenta que conoces a la perfección esta tesis, por favor genera un prompt robusto y contundente para el agente redactor teniendo en cuenta cada una de las especificaciones necesarias junto a aquellas que consideres oportunas. Recuerda indicarme claramente que archivos deberé proporcionarle a este agente como contexto para que lleve esta tarea a cabo de la mejor manera posible.

Entendido. Esta fase es fascinante, pues transformamos la reflexión personal en un análisis académico riguroso. La tarea requiere un equilibrio delicado: mantener la autenticidad de tu voz autoetnográfica mientras se eleva el texto a un estándar doctoral, enriqueciéndolo con el aparato teórico que ya hemos construido.

He diseñado un prompt único y muy detallado para el agente redactor. Este prompt es "holístico", es decir, le pide que aborde la redacción del **capítulo 3 completo** (las tres subsecciones) en una sola pasada. Dado que estás usando un LLM con una ventana de contexto amplia, este enfoque tiene una ventaja crucial: asegura la máxima coherencia, fluidez y cohesión a lo largo de todo el capítulo, evitando saltos lógicos o cambios de tono entre las subsecciones.

---

### **Archivos a Incluir como Contexto**

Para que el agente redactor pueda ejecutar esta compleja tarea de síntesis y redacción, necesitarás proporcionarle un contexto completo y bien estructurado:

1. **Las Fuentes Primarias de este Capítulo (Tus Reflexiones y Esbozos):**
    - `sections/4-seccion-3/draft/description.md`
    - `sections/4-seccion-3/draft/3.1-draft.md`
    - `sections/4-seccion-3/draft/3.2-draft.md`
    - `sections/4-seccion-3/draft/3.3-draft.md`

2. **El Andamiaje Teórico (Capítulo 1 Completo):**
    - Es fundamental que le proporciones el texto completo y ya revisado del **Capítulo 1 (Marco Teórico)**. Esto es lo que permitirá al agente crear las referencias cruzadas y conectar tu praxis con la teoría. Deberás concatenar en un solo archivo los siguientes documentos:
        - `sections/2-seccion-1/content/1.0-cuerpo.md`
        - `sections/2-seccion-1/content/1.1-cuerpo.md`
        - `sections/2-seccion-1/content/1.2-cuerpo.md`
        - `sections/2-seccion-1/content/1.3-cuerpo.md`

---

### **Prompt para la Redacción del Capítulo 3**

**ROL Y OBJETIVO:**

Actúa como un redactor académico experto en investigación cualitativa, con especialización en autoetnografía y pedagogía de las artes escénicas.

Genial. Actuando como un redactor académico experto en investigación cualitativa, con especialización en autoetnografía y pedagogía de las artes escénicas, tu tarea es redactar el **Capítulo 3 completo** de esta tesis doctoral. Debes transformar los esbozos y reflexiones personales del autor en una prosa académica rigurosa, muy detallada y analítica. El objetivo es construir un capítulo coherente y expansivo que narre y analice el proceso pedagógico del autor, conectando constantemente la práctica descrita con el marco teórico ya establecido en la tesis.

**PROTOCOLO DE REDACCIÓN:**

**Fase 1: Asimilación Profunda del Contexto**

1. **Comprende la Praxis del Autor:** Lee y asimila en su totalidad los cuatro archivos de "fuentes primarias" (`description.md` y los tres archivos `draft`). Tu objetivo es interiorizar no solo los eventos, sino también las reflexiones, los desafíos y las soluciones que el autor ha esbozado.
2. **Domina el Marco Teórico:** Estudia a fondo el **Capítulo 1 (Marco Teórico)** proporcionado. Este es tu glosario conceptual y tu caja de herramientas analíticas. Presta especial atención a los indicadores de sección (ej. `{#el-cuerpo-escenico}`).

**Fase 2: Redacción Expansiva y Analítica**

1. **Redacción Extensa y Descriptiva:** Para cada subsección (3.1, 3.2, 3.3), transforma el esbozo en un texto final. Tu redacción debe ser **lo más extensa y descriptiva posible**. No asumas que el lector es un experto. Cada concepto, cada desafío y cada estrategia pedagógica debe ser explicado con tal claridad que un lector no especializado pueda comprenderlo en profundidad.
2. **Mantén el Rigor Académico:** Aunque el capítulo es autoetnográfico, el tono debe ser analítico y reflexivo, no meramente anecdótico. Utiliza un lenguaje académico preciso y una estructura de párrafos lógica para presentar los argumentos.
3. **Integración de Referencias Cruzadas (Requisito Indispensable):** A medida que redactas, debes tejer activamente conexiones con el Marco Teórico. Utiliza el sistema de referencias cruzadas especificado para vincular la praxis con la teoría.
    Las referencias cruzadas de realizan de la siguiente manera:

    - **indicadores**: cada título de sección o subsección cuenta con un indicador declarado entre llaves, sin espacios, y comenzando con el símbolo de número (e.j. {#indicador-de-la-seccion})
    - **vínculos**: en el cuerpo, para establecer una referencia cruzada se pone entre corchetes el formato y seguido entre paréntesis el indicador al que hace referencia (e.j. [Paragraph Number & Page Number](#indicador-de-seccion) )

    Los formatos de referencia cruzada disponibles son:

    - **Paragraph Number & Page Number**: resulta en '3.1 en pág. 43'
    - **Enclosed Paragraph Number & Page Number**: resulta en '(3.1 en pág. 43)'
    - **Page Number**: resulta en 'pág. 43'
    - **Enclosed Page Number**: resulta en '(pág. 43)'

    Ejemplos de Aplicación:

    - Al describir la diversidad de perfiles en la sección 3.1, debes referenciar la sección donde definiste al "intérprete escénico transversal". (ej. "...un inmenso abanico de particularidades que debían redirigirse hacia el perfil funcional del 'intérprete escénico transversal' que establecimos anteriormente [Paragraph Number & Page Number](#justificacion-de-la-delimitacion)").
    - En la sección 3.2, al hablar de la "resignificación del lenguaje" y el uso de las 6W, debes referenciar la sección donde presentaste este marco por primera vez. (ej. "...retomando el filtro analítico de las 6W que se introdujo como herramienta metodológica en la sección [Paragraph Number & Page Number](#definicion-y-desarrollo-preparacion-elemental)").
    - Al explicar el trabajo en el suelo para aislar el factor "Peso" en la sección 3.2, referencia la sección donde definiste la Teoría del Esfuerzo de Laban. (ej. "...aislar factores de movimiento, especialmente el 'Peso' del cuerpo, uno de los cuatro factores del Esfuerzo descritos por Laban [Paragraph Number & Page Number](#analisis-del-movimiento-de-laban)").
    - Al describir los "Resultados Observados" en la sección 3.3 (ej. "mejora de la colocación corporal"), referencia las secciones del marco teórico donde se definieron esas necesidades (ej. "...una notable mejora en la organización postural, abordando directamente la necesidad de 'Conciencia del Eje y Colocación Corporal' [Paragraph Number & Page Number](#conciencia-del-eje)").

**TAREA CONCRETA:**

Redacta el texto final y completo para las tres subsecciones del Capítulo 3 (`3.1`, `3.2` y `3.3`), fusionando la información de los esbozos y la descripción en tres textos coherentes. Asegúrate de que las transiciones entre las subsecciones sean fluidas y lógicas. Puedes usar el sistema de to-dos para llevar a cabo esta tarea paso a paso de manera sistemática y metódica, asegurándote siempre de cumplimentar cada paso y no perderte en el camino.

**FORMATO DE SALIDA:**

Genera tres archivos de texto markdown separados, uno para cada subsección:

1. `sections/4-seccion-3/content/3.1-cuerpo.md`
2. `sections/4-seccion-3/content/3.2-cuerpo.md`
3. `sections/4-seccion-3/content/3.3-cuerpo.md`

Cada archivo debe contener el texto final, redactado según todas las especificaciones anteriores.

---

Comprendido. El desafío de una ventana de contexto limitada exige un prompt de una eficiencia y precisión quirúrgicas. No podemos permitirnos ambigüedades. El agente revisor debe ser "cargado" con el contexto esencial de la tesis de la manera más densa posible para poder realizar una evaluación profunda.

He diseñado un prompt robusto que aborda esta limitación de frente. Lo he estructurado para que actúe como un "dossier de revisión" completo. Incluye un **"Resumen Ejecutivo del Marco Teórico"** que le proporcionará al agente el conocimiento indispensable del Capítulo 1 sin necesidad de leerlo, permitiéndole así evaluar las conexiones y la coherencia del Capítulo 3 con el rigor que exigimos.

---

### **Archivos a Incluir como Contexto**

Para que el agente pueda realizar la tarea, deberás proporcionarle **un único archivo de texto** que contenga el contenido de los cuatro archivos del Capítulo 3, concatenados en el siguiente orden:

1. `sections/4-seccion-3/content/3.0-cuerpo.md`
2. `sections/4-seccion-3/content/3.1-cuerpo.md`
3. `sections/4-seccion-3/content/3.2-cuerpo.md`
4. `sections/4-seccion-3/content/3.3-cuerpo.md`

---

### **Prompt para la Revisión del Capítulo 3 (Contexto Limitado)**

**ROL Y OBJETIVO:**

Actúa como un Revisor Académico Senior para una tesis doctoral, especializado en Metodologías de Investigación Cualitativa, Autoetnografía y Pedagogía de las Artes Escénicas. Tu tarea es realizar una revisión por pares, exhaustiva y crítica, del Capítulo 3 de una tesis. Tu objetivo es evaluar su rigor, coherencia y profundidad, y proponer recomendaciones concretas para elevarlo al más alto nivel de excelencia académica.

**CONTEXTO ESENCIAL DE LA TESIS (BRIEFING):**

**No tienes acceso al Capítulo 1 (Marco Teórico), pero su contenido es crucial para entender este capítulo. A continuación se presenta un resumen ejecutivo de los conceptos clave establecidos en dicho capítulo y a los que el texto que revisarás hace referencia constante:**

- **Paradoja Central de la Tesis:** La investigación se articula en torno a la "paradoja de la Danza Clásica": un sistema *técnico* de inmenso valor, atrapado en un sistema *pedagógico* tradicional, excluyente y anacrónico que no responde a las necesidades del artista del siglo XXI.
- **Intérprete Escénico Transversal:** Este es el sujeto de estudio. No es un bailarín clásico, sino un artista del movimiento (danza contemporánea, teatro físico, circo) cuyo instrumento principal es el cuerpo y que necesita desarrollar capacidades funcionales y transversales, no un estilo específico.
- **Preparación Elemental:** Es el concepto que propone la tesis. Se define como el conjunto de competencias psicofísicas y cinéticas fundamentales que son prerrequisito para cualquier especialización escénica (control del eje, conciencia espacial, fuerza funcional, etc.). El objetivo de la tesis es adaptar la Danza Clásica para que sirva como herramienta de "preparación elemental".
- **Marco Analítico de Laban (LMA):** El marco teórico utiliza el Análisis del Movimiento de Laban como herramienta principal para desglosar y categorizar las necesidades del intérprete, usando sus cuatro categorías: **Cuerpo** (*qué* se mueve), **Espacio** (*dónde*), **Esfuerzo** (*con qué cualidad*) y **Forma** (*cómo cambia el cuerpo*).
- **Críticas a la Pedagogía Tradicional:** El marco teórico ha establecido una crítica a la pedagogía del ballet basada en la **autoridad vertical**, el **aprendizaje por imitación** (mimesis), la falta de atención a la diversidad y una **comunicación deficiente**.
- **Referencias Cruzadas:** El texto utiliza un sistema de referencias cruzadas (ej. `[Paragraph Number & Page Number](#identificador)`) para vincular las acciones prácticas descritas en este capítulo con los conceptos teóricos del capítulo anterior. Tu tarea es evaluar si estos vínculos son lógicos y significativos.

**TAREA DE REVISIÓN:**

Basándote en el *briefing* anterior y en una lectura profunda del capítulo proporcionado, redacta un informe de revisión exhaustivo que evalúe los siguientes criterios:

1. **Coherencia y Flujo Narrativo:** ¿El capítulo narra una historia convincente y lógicamente estructurada desde el planteamiento del problema (`3.1`) hasta la descripción de los resultados (`3.3`)? ¿Las transiciones entre subsecciones son fluidas?
2. **Profundidad del Análisis Praxeológico:** ¿El capítulo trasciende la mera descripción de actividades para ofrecer un verdadero **análisis reflexivo**? ¿La voz del autor como "investigador en el aula" es palpable y creíble? ¿Se analizan las causas de los problemas y la lógica de las soluciones con la profundidad esperada a nivel doctoral?
3. **Conexión entre Práctica y Teoría:** Este es el criterio más importante. ¿Las estrategias pedagógicas descritas en la sección `3.2` son una respuesta directa y lógica a los desafíos presentados en la `3.1`? ¿Los resultados descritos en la `3.3` demuestran de manera convincente la eficacia de dichas estrategias? ¿Las referencias cruzadas al marco teórico (según el *briefing*) son pertinentes y enriquecen el argumento?
4. **Claridad y Accesibilidad:** ¿La redacción es clara, precisa y accesible para un lector académico que no sea un especialista en danza? ¿Se evitan jergas no explicadas? ¿Los ejemplos prácticos son suficientemente descriptivos para ser comprendidos?
5. **Rigor y Excelencia Académica:** ¿El capítulo en su conjunto cumple con los estándares de una tesis doctoral de alto nivel? ¿Identificas alguna afirmación que requiera un mayor respaldo, alguna sección que parezca superficial o alguna oportunidad perdida para profundizar en el análisis?

**FORMATO DE SALIDA:**

Genera un **Informe de Revisión** estructurado en dos partes:

**Parte 1: Evaluación Crítica**
Presenta tu análisis detallado, organizado según los cinco criterios anteriores. Para cada punto, sé específico: cita fragmentos del texto para ilustrar tus observaciones y justifica tus valoraciones.

**Parte 2: Recomendaciones para la Excelencia**
Concluye con una lista de recomendaciones concretas, accionables y priorizadas para mejorar el capítulo. No te limites a señalar problemas; propón soluciones específicas de re-escritura, re-estructuración o profundización que eleven el texto a su máximo potencial.
