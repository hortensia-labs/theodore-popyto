# Plan de Revisión: Marcadores Editoriales Sin Resolver

**Fecha**: 10 de marzo de 2026
**Prioridad**: Mayor — debería resolverse
**Secciones afectadas**: Capítulos 1, 2, 3, 4, 5, 6, 7 (toda la tesis)
**Esfuerzo estimado**: Alto en volumen, bajo en complejidad (trabajo mecánico)

---

## 1. Diagnóstico del problema

### Descripción

Más de 80 instancias de `[Paragraph Number & Page Number]` sin resolver a lo largo de toda la tesis, además de notas `[PENDIENTE]` y `[REVISAR]` en los capítulos 3 y 4. Aunque es un problema editorial y no argumentativo, genera una impresión de trabajo incompleto que un tribunal detectaría inmediatamente.

### Tipos de marcadores detectados

| Tipo | Patrón | Descripción |
|------|--------|-------------|
| Referencias cruzadas vacías | `[Paragraph Number & Page Number]` | Placeholders para referencias internas a párrafos/páginas de otros capítulos |
| Notas pendientes | `[PENDIENTE]`, `[PENDIENTE: ...]` | Contenido por desarrollar o decisiones por tomar |
| Notas de revisión | `[REVISAR]`, `[REVISAR: ...]` | Pasajes marcados para revisión posterior |
| Otros posibles | `[TODO]`, `[XXX]`, `[NOTA]`, `[REF]` | Otros marcadores de trabajo en progreso |

### Por qué es grave

- Genera una primera impresión de trabajo incompleto que condiciona la lectura del tribunal
- ~80+ instancias sugiere un problema sistémico, no un descuido aislado
- Si el tribunal abre la tesis y ve marcadores, puede cuestionar la madurez del trabajo antes de leer el argumento
- Especialmente problemático en un documento que aspira a demostrar rigor académico

---

## 2. Estrategia de resolución

### Principio rector

**Resolución exhaustiva y verificable.** Este es un problema puramente mecánico pero requiere atención total: cada marcador debe resolverse individualmente (no eliminarse en blanco).

### Protocolo de resolución por tipo

#### Tipo 1: `[Paragraph Number & Page Number]`

Estas son referencias cruzadas internas. Para cada instancia:

1. **Identificar el contexto**: leer el párrafo que contiene el marcador para determinar a qué se refiere
2. **Decisión**:
   - Si la referencia es a un capítulo/sección específica → reemplazar por referencia textual: "como se discutió en el Capítulo X" o "véase §X.Y"
   - Si la referencia es genérica y prescindible → eliminar el placeholder y reformular la frase
   - Si la referencia requiere número de página → dado que la paginación final se genera en InDesign, reemplazar por referencia a sección/capítulo (no a página)

**Nota técnica**: La tesis se compila en InDesign desde ICML. Las referencias a "números de página" no son viables en el markdown fuente. Todas las referencias internas deben ser a secciones/capítulos.

#### Tipo 2: `[PENDIENTE]` y `[PENDIENTE: ...]`

Para cada instancia:

1. **Evaluar el contenido pendiente**: ¿es esencial o prescindible?
2. **Si esencial**: desarrollar el contenido faltante como parte de esta revisión o de otra intervención planificada
3. **Si prescindible**: eliminar el marcador y ajustar la redacción circundante
4. **Si depende de otra revisión**: anotar la dependencia y resolver tras completar la revisión correspondiente

#### Tipo 3: `[REVISAR]` y `[REVISAR: ...]`

Para cada instancia:

1. **Leer el pasaje marcado**: determinar qué necesita revisión
2. **Si es cuestión de estilo/redacción**: revisar y eliminar marcador
3. **Si es cuestión de contenido/argumento**: resolver como parte de la revisión correspondiente (circularidad, funcionalismo, etc.)
4. **Eliminar el marcador** una vez resuelto

---

## 3. Plan de implementación

### Fase 1: Auditoría completa (inventario)

**Acción**: Ejecutar búsqueda automatizada en todos los archivos de contenido:

```bash
# Buscar todos los marcadores en archivos de contenido
grep -rn "\[Paragraph" sections/*/content/*.md
grep -rn "\[PENDIENTE" sections/*/content/*.md
grep -rn "\[REVISAR" sections/*/content/*.md
grep -rn "\[TODO" sections/*/content/*.md
grep -rn "\[XXX" sections/*/content/*.md
grep -rn "\[NOTA" sections/*/content/*.md
grep -rn "\[REF" sections/*/content/*.md
```

**Producto**: Lista completa de marcadores con archivo, línea y contexto.

### Fase 2: Clasificación y priorización

Clasificar cada marcador según:
1. **Tipo**: referencia cruzada / pendiente / revisión / otro
2. **Resolución**: inmediata (mecánica) / requiere desarrollo / depende de otra revisión
3. **Sección**: para organizar el trabajo por capítulo

### Fase 3: Resolución por capítulo

Procesar capítulo por capítulo, empezando por los que tienen más marcadores:

**Orden sugerido** (de más a menos instancias estimadas):
1. Cap. 3 (Fundamentos I) — probablemente el más denso en marcadores
2. Cap. 5 (Marco) — siguiente en extensión
3. Cap. 6 (Discusión)
4. Cap. 4 (Fundamentos II)
5. Cap. 1 (Introducción)
6. Cap. 2 (Metodología)
7. Cap. 7 (Conclusiones)

### Fase 4: Verificación

**Acción**: Re-ejecutar las búsquedas de la Fase 1 para confirmar cero resultados.

**Producto**: Confirmación de que no quedan marcadores.

---

## 4. Convenciones de reemplazo para referencias cruzadas

Dado que la tesis no usa números de página en el markdown fuente (la paginación se genera en InDesign), todas las referencias internas deben seguir este formato:

| Referencia a... | Formato propuesto |
|-----------------|-------------------|
| Capítulo completo | "como se desarrolla en el Capítulo 3" |
| Sección específica | "véase §3.1.1" |
| Concepto ya introducido | "la distinción *Körper*/*Leib* (cf. §3.1.1)" |
| Viñeta específica | "como ilustra la Viñeta A (§6.1.1)" |
| Tabla o figura | "Tabla X en §Y.Z" |
| Referencia genérica prescindible | Eliminar y reformular: "como se ha argumentado" |

---

## 5. Criterios de completitud

- [ ] Auditoría completa ejecutada (Fase 1)
- [ ] Lista de marcadores clasificada por tipo, resolución y sección (Fase 2)
- [ ] Todos los `[Paragraph Number & Page Number]` resueltos
- [ ] Todos los `[PENDIENTE]` resueltos o desarrollados
- [ ] Todos los `[REVISAR]` resueltos
- [ ] Verificación automatizada confirma cero marcadores restantes (Fase 4)
- [ ] Reformulaciones revisadas para naturalidad del texto

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Algunos `[PENDIENTE]` requieren contenido sustantivo que aún no existe | Anotar como dependencia; priorizar resolución de contenido antes de cerrar marcadores |
| Eliminar marcadores sin resolver el problema subyacente (cosmético) | Leer siempre el contexto antes de eliminar; nunca eliminar en blanco |
| Introducir errores al reformular frases que contenían marcadores | Releer cada párrafo modificado para verificar coherencia |
| Nuevos marcadores introducidos por otras revisiones de round-2 | Ejecutar verificación final después de completar TODAS las revisiones del round-2 |

---

## 7. Dependencias

Este plan debe ejecutarse **después** de completar las otras revisiones del round-2, ya que:
- Las intervenciones en Caps. 3, 4, 5, 6, 7 pueden introducir nuevos marcadores temporales
- Las reformulaciones de contenido pueden resolver algunos `[PENDIENTE]` como efecto secundario
- La verificación final debe ser el último paso del proceso de revisión completo
