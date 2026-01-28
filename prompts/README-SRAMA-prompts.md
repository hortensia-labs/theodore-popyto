# Prompts de Orquestación SRAMA

Esta carpeta contiene prompts pre-configurados para lanzar el Sistema de Redacción Académica Multi-Agente (SRAMA) para cada capítulo de la tesis.

---

## Orden de Ejecución Recomendado

### Fase A: Capítulos Independientes (Ejecutar en Paralelo)

Estos capítulos NO dependen el uno del otro y pueden ejecutarse simultáneamente en conversaciones separadas:

| Prompt | Capítulo | Sources | Tiempo Est. |
|--------|----------|---------|-------------|
| `SRAMA-capitulo-3-fundamentos-1.md` | Cap. 3: Fundamentos Teóricos I | 17 | 50-75 min |
| `SRAMA-capitulo-4-fundamentos-2.md` | Cap. 4: Fundamentos Teóricos II | 4 | 35-50 min |

### Fase B: Capítulos Dependientes (Ejecutar Secuencialmente)

Estos capítulos requieren que los capítulos 3 y 4 estén completos:

| Orden | Capítulo | Dependencias | Prompt |
|-------|----------|--------------|--------|
| 1 | Cap. 5: El Marco "Resistencia Encarnada" | Cap. 3 + Cap. 4 | Por crear |
| 2 | Cap. 6: Discusión | Cap. 3 + Cap. 4 + Cap. 5 | Por crear |
| 3 | Cap. 1: Introducción | Todos los anteriores | Por crear |
| 4 | Cap. 2: Metodología | Todos los anteriores | Por crear |
| 5 | Cap. 7: Conclusiones | Todos los anteriores | Por crear |

---

## Cómo Usar los Prompts

### Paso 1: Abrir Nueva Conversación

Inicia una nueva conversación en Cursor/Claude.

### Paso 2: Incluir Archivos de Contexto

Cada prompt especifica los archivos a incluir con `@`. Asegúrate de incluirlos todos antes de pegar el prompt.

**Archivos siempre requeridos:**

```
@core/Base de la tesis.md
@core/Indice de contenidos.md
@.claude/skills/academic-writing-style.md
@.claude/agents/srama-orchestrator.md
@rules/cross-references.md
```

**Más los sources del capítulo específico:**

```
@sections/[X-nombre]/sources/
```

### Paso 3: Copiar y Pegar el Prompt

Copia el contenido dentro del bloque ``` del archivo de prompt y pégalo en la conversación.

### Paso 4: Monitorear Progreso

El sistema proporcionará actualizaciones en cada fase:

- Fase 1: Síntesis (generación de outline)
- Fase 2: Redacción (generación de contenido)
- Fase 3: Refinamiento (humanización y evaluación)

### Paso 5: Revisar Outputs

Al finalizar, revisa:

1. `_section-outline.md` - Estructura generada
2. `content/*.md` - Contenido del capítulo
3. `evaluation/*.md` - Reporte de calidad
4. Busca marcadores `[NOTA:]`, `[PENDIENTE:]`, `[REVISAR:]`

---

## Ejecución Paralela (Capítulos 3 y 4)

Para ejecutar ambos capítulos simultáneamente:

1. **Conversación A**: Lanza el prompt del Capítulo 3
2. **Conversación B**: Lanza el prompt del Capítulo 4
3. Ambos pueden ejecutarse al mismo tiempo
4. Al finalizar ambos, ejecuta una validación cruzada de continuidad

### Validación Cruzada Post-Paralela

Después de completar ambos capítulos, ejecuta en una nueva conversación:

```
Por favor, ejecuta el continuity-agent para validar la coherencia entre:
- sections/3-fundamentos-1/content/
- sections/4-fundamentos-2/content/

Verifica:
1. Consistencia terminológica entre ambos capítulos
2. Que no haya contradicciones conceptuales
3. Que las referencias cruzadas pendientes sean resolubles
4. Que ambos preparen adecuadamente el Capítulo 5
```

---

## Resolución de Problemas

### El sistema se detiene en Quality Gate

Si el sistema reporta que no pasa un quality gate:

1. Revisa el mensaje de error específico
2. Corrige el issue indicado
3. Reanuda desde la fase donde se detuvo

### Sources insuficientes detectados

Si el sistema marca `[NOTA: Posible necesidad de investigación adicional...]`:

1. Decide si el vacío es crítico
2. Si es crítico: genera sources adicionales y reinicia
3. Si no es crítico: marca para revisión posterior

### Referencias cruzadas a capítulo inexistente

Es normal durante la Fase A. El sistema usará marcadores `[PENDIENTE: ref Cap X]` que se resolverán cuando ese capítulo exista.

---

## Estructura de Outputs

Después de ejecutar cada prompt, la sección tendrá:

```
sections/[X-nombre]/
├── _section-outline.md          # Estructura del capítulo
├── _workflow-status.json        # Estado del flujo (si aplica)
│
├── content/
│   ├── X.1.1-subseccion.md     # Contenido final
│   ├── X.1.2-subseccion.md
│   └── ...
│
├── references/
│   ├── crossref-index.json     # Registro de anchors
│   └── crossref-report.md      # Reporte de validación
│
└── evaluation/
    └── chapter-X-report.md     # Reporte de calidad
```

---

## Contacto y Soporte

Si encuentras problemas con los prompts:

1. Verifica que todos los archivos de contexto estén incluidos
2. Revisa que la estructura de carpetas esté correcta
3. Consulta `docs/SRAMA_WORKFLOW_GUIDE.md` para más detalles

---

*Última actualización: Enero 2026*
