# Skill: Estilo de Redacción Académica para Tesis Doctoral

## Propósito

Este skill define las reglas de estilo, formato y redacción que deben seguir todos los agentes involucrados en la generación de contenido para la tesis doctoral "Resistencia Encarnada".

---

## 1. Idioma y Registro

### 1.1 Idioma Base
- **Español Peninsular** (variante de España)
- Evitar americanismos o regionalismos de Latinoamérica
- Usar "vosotros" cuando corresponda, aunque en texto académico se prefiere la impersonalidad

### 1.2 Registro Académico
- Formal pero accesible
- Evitar coloquialismos
- Precisión terminológica sin pedantería innecesaria
- Claridad sobre oscurantismo

### 1.3 Persona Gramatical
- **Primera persona del plural** ("nosotros") para:
  - Afirmaciones metodológicas: "Proponemos un marco..."
  - Posicionamiento argumentativo: "Sostenemos que..."
  - Transiciones: "Como hemos visto..."
- **Impersonal** para:
  - Descripciones objetivas: "Se observa que..."
  - Referencias a la literatura: "La investigación muestra..."
- **Evitar**: Primera persona del singular ("yo") excepto en agradecimientos

---

## 2. Formato de Citas (APA 7ª Edición)

### 2.1 Citas en Texto

**Un autor:**
- Narrativa: Merleau-Ponty (1945) argumenta que...
- Parentética: ...la percepción corporal (Merleau-Ponty, 1945).

**Dos autores:**
- Narrativa: Varela y Thompson (1991) proponen...
- Parentética: ...cognición enactiva (Varela y Thompson, 1991).

**Tres o más autores:**
- Usar "et al." desde la primera cita: Lakoff et al. (1999) o (Lakoff et al., 1999)

**Múltiples obras:**
- Orden alfabético, separadas por punto y coma: (Autor1, 2020; Autor2, 2018)

**Cita directa:**
- Incluir página: (Merleau-Ponty, 1945, p. 142)
- Citas de más de 40 palabras: bloque indentado sin comillas

### 2.2 Formato de Cita Directa Larga

```markdown
> La percepción no es una ciencia del mundo, no es siquiera un acto, una
> toma de posición deliberada, sino el fondo sobre el cual se destacan
> todos los actos y que todos los actos presuponen. (Merleau-Ponty, 1945,
> p. 10)
```

---

## 3. Referencias Cruzadas

### 3.1 Sistema de Anchors

Cada sección y subsección debe tener un identificador único:

```markdown
## 3.1. El Cuerpo como Lugar de Conocimiento {#cuerpo-conocimiento}
```

**Reglas para identificadores:**
- Minúsculas
- Guiones en lugar de espacios
- Sin caracteres especiales ni acentos
- Descriptivos pero concisos
- Únicos en todo el documento

### 3.2 Formatos de Vinculación

| Formato | Resultado | Uso |
|---------|-----------|-----|
| `[Paragraph Number & Page Number](#anchor)` | "3.1 en pág. 43" | Referencias directas en el texto |
| `[Enclosed Paragraph Number & Page Number](#anchor)` | "(3.1 en pág. 43)" | Referencias parentéticas |
| `[Page Number](#anchor)` | "pág. 43" | Cuando el número de sección es evidente |
| `[Enclosed Page Number](#anchor)` | "(pág. 43)" | Referencias parentéticas de página |

### 3.3 Ejemplos de Aplicación

```markdown
Como establecimos en la sección [Paragraph Number & Page Number](#cognicion-corporeizada), 
el concepto de *Leib* es fundamental para comprender...

Esta distinción fenomenológica [Enclosed Paragraph Number & Page Number](#korper-leib) 
constituye la base de nuestro análisis.
```

---

## 4. Estructura del Texto

### 4.1 Jerarquía de Encabezados

```markdown
# Capítulo X: Título del Capítulo {#capitulo-x}

## X.1. Sección Principal {#seccion-principal}

### X.1.1. Subsección {#subseccion}

#### Apartado (sin numeración, usar con moderación)
```

### 4.2 Párrafos

- **Longitud óptima**: 100-200 palabras
- **Estructura**: Idea principal → Desarrollo → Conexión con siguiente
- **Una idea central por párrafo**
- Evitar párrafos de una sola oración
- Evitar párrafos excesivamente largos (>300 palabras)

### 4.3 Transiciones

Usar conectores variados y apropiados:

**Adición:** además, asimismo, igualmente, por otra parte
**Contraste:** sin embargo, no obstante, por el contrario, en cambio
**Causa:** por tanto, en consecuencia, de ahí que, por consiguiente
**Ejemplificación:** por ejemplo, en particular, concretamente, a saber
**Conclusión:** en síntesis, en definitiva, en suma, finalmente

**Evitar**: "Además" repetido, "Por otro lado" en exceso

---

## 5. Vocabulario y Terminología

### 5.1 Términos Clave de la Tesis

Mantener consistencia en la traducción y uso de términos:

| Término | Uso correcto | Evitar |
|---------|--------------|--------|
| *Leib* | En cursiva, sin traducir | "cuerpo vivido" como traducción única |
| *Körper* | En cursiva, sin traducir | "cuerpo objeto" como traducción única |
| Cognición corporeizada | Preferido | "Cognición encarnada" (usar como sinónimo ocasional) |
| Co-creación | Con guion | "Cocreación" |
| Inteligencia Artificial / IA | Mayúsculas iniciales | "inteligencia artificial" |
| Marco teórico | Sin comillas | "Marco" solo cuando el contexto es claro |

### 5.2 Vocabulario a Evitar (Marcadores de IA)

**Palabras sobreutilizadas:**
- "delve/profundizar" → usar: examinar, analizar, explorar, investigar
- "robust/robusto" → usar: sólido, fundamentado, riguroso
- "comprehensive/comprehensivo" → usar: exhaustivo, amplio, detallado
- "innovative/innovador" → usar: novedoso, original (con moderación)
- "crucial" → usar: fundamental, esencial, determinante
- "leverage/apalancar" → usar: utilizar, emplear, aprovechar
- "pivotal" → usar: central, clave, determinante

**Estructuras a evitar:**
- "Es importante destacar que..." → ir directo al punto
- "Cabe mencionar que..." → eliminar o reformular
- "En el contexto de..." (cuando es obvio) → omitir

### 5.3 Hedging Académico (Matización)

Incorporar matización natural:

**Verbos:**
- "sugiere", "indica", "apunta hacia"
- "parece", "podría", "tendería a"

**Adverbios:**
- "posiblemente", "aparentemente", "presumiblemente"
- "en cierta medida", "hasta cierto punto"

**Construcciones:**
- "Los datos parecen sugerir..."
- "Podría argumentarse que..."
- "Esto apuntaría hacia..."

---

## 6. Formato Especial

### 6.1 Listas

**Usar listas cuando:**
- Se enumeran 3+ elementos relacionados
- La claridad lo requiere
- Se presenta una taxonomía o clasificación

**Formato:**
```markdown
Los cuatro pilares del marco son:

1. **Cognición corporeizada**: fundamenta la experiencia del cuerpo vivido.
2. **Economía laboral**: analiza la descomposición del trabajo creativo.
3. **Teoría del valor artístico**: examina la constitución del significado estético.
4. **Poética de la danza**: ancla el análisis en el conocimiento específico del campo.
```

### 6.2 Énfasis

- **Negrita**: para conceptos clave en su primera aparición o definición
- *Cursiva*: para términos en otros idiomas, títulos de obras, énfasis sutil
- Evitar MAYÚSCULAS para énfasis
- Evitar subrayado

### 6.3 Notas del Autor

Durante la redacción, usar marcadores para revisión humana:

```markdown
[NOTA: Verificar esta afirmación con fuente primaria]
[PENDIENTE: Añadir ejemplo concreto de práctica coreográfica]
[REVISAR: Posible solapamiento con sección 3.2]
```

---

## 7. Principios de Síntesis

### 7.1 De Sources a Contenido Final

El contenido final debe ser:
- **Más sintético** que los sources (no repetición)
- **Más argumentativo** (no solo descriptivo)
- **Más integrado** (conexiones entre fuentes)
- **Original en su articulación** (no patchwork de citas)

### 7.2 Densidad Argumentativa

- Cada párrafo debe avanzar el argumento
- Evitar repetición de ideas ya establecidas
- Integrar evidencia de múltiples fuentes cuando sea pertinente
- Conectar explícitamente con la hipótesis central cuando corresponda

### 7.3 Balance Teórico-Empírico

- Fundamentar afirmaciones teóricas con evidencia
- Contextualizar datos empíricos dentro del marco teórico
- Mantener coherencia entre nivel abstracto y concreto

---

## 8. Checklist de Calidad

Antes de finalizar cualquier sección, verificar:

### Contenido
- [ ] ¿Avanza la hipótesis central de la tesis?
- [ ] ¿Están todas las afirmaciones sustentadas?
- [ ] ¿Se integran adecuadamente los pilares teóricos relevantes?

### Formato
- [ ] ¿Todas las citas siguen APA 7?
- [ ] ¿Están los anchors correctamente formateados?
- [ ] ¿La jerarquía de encabezados es consistente?

### Estilo
- [ ] ¿Se evitan los marcadores de IA?
- [ ] ¿Hay variación en la estructura de oraciones?
- [ ] ¿El hedging académico es natural, no mecánico?

### Coherencia
- [ ] ¿Las transiciones entre párrafos son fluidas?
- [ ] ¿Se mantiene consistencia terminológica?
- [ ] ¿Las referencias cruzadas son pertinentes?

---

## Uso de este Skill

Este skill debe ser referenciado por los siguientes agentes:
- `drafting-agent`
- `synthesis-agent`
- `evaluation-agent`
- `voice_agent` (para refinamiento)

Los agentes deben aplicar estas reglas de forma integrada, no mecánica, priorizando siempre la naturalidad y claridad del texto académico.
