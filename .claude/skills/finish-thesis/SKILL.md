---
name: finish-thesis
description: Loop agéntico autónomo para terminar la tesis doctoral con calidad y rigor. Ejecuta por cada sección un ciclo DRS (revisión triple-lens) → reescritura profunda → pulido de estilo IRA → verificación, seguido de una pasada de consistencia global y compilación final. Usar cuando el usuario pida "terminar la tesis", "finish thesis", "loop de calidad" o retomar el proceso donde quedó.
---

# Finish Thesis — Loop Agéntico de Calidad y Rigor

Eres el **director del proceso de finalización** de la tesis doctoral "Resistencia Encarnada". Tu trabajo es llevar cada sección desde su estado actual hasta la **Expectativa Final** (abajo) mediante un ciclo autónomo de revisión → reescritura → verificación. Operas sin supervisión: no pidas confirmación entre secciones; solo detente ante errores irrecuperables o si vas a hacer algo destructivo no contemplado aquí.

## Expectativa Final (Definition of Done)

Una sección está **TERMINADA** cuando cumple TODO lo siguiente:

1. **Rigor argumentativo**: la síntesis DRS de re-verificación no contiene ningún hallazgo de severidad crítica o alta sin resolver. Toda cadena premisa → evidencia → conclusión es sólida; sin saltos argumentativos ni contradicciones internas.
2. **Estilo y voz**: el diagnóstico IRA no reporta patrones de severidad alta (monotonía sintáctica, vocabulario genérico de IA, ausencia de matiz/hedging). La prosa cumple el skill `academic-writing-style` (español peninsular, registro formal accesible, precisión terminológica).
3. **Integridad del contenido**: ninguna cita ni referencia se ha perdido o alterado durante la reescritura; el significado y las contribuciones originales se preservan.
4. **Trazabilidad**: reviews, síntesis e informe de cambios guardados; cambios commiteados en git.

La **tesis** está TERMINADA cuando: las 7 secciones revisables están TERMINADAS, la pasada de consistencia global no deja hallazgos críticos/altos, `make compile-all` termina sin errores, y existe el informe final.

## Estado persistente

Mantén el estado en `generated/reports/finish-thesis/ledger.json`:

```json
{
  "sections": {
    "1-introduccion": {"status": "done|in-progress|pending", "iterations": 1, "last_step": "drs|rewrite|ira|verify|commit", "criticos_restantes": 0}
  },
  "global_pass": "pending|done",
  "final_build": "pending|done"
}
```

**Al iniciar, SIEMPRE lee el ledger primero.** Si existe, retoma desde la primera sección no terminada y su `last_step`. Si no existe, créalo con todas las secciones en `pending`. Actualízalo tras cada paso completado. Además mantén un log humano en `generated/reports/finish-thesis/log.md` (una línea por evento con fecha).

## Alcance

- Secciones a procesar, en orden: `1-introduccion`, `2-metodologia`, `3-fundamentos-1`, `4-fundamentos-2`, `5-marco-resistencia`, `6-discusion`, `7-conclusiones`.
- **NO tocar**: `0-covermatter`, `8-bibliografia`, `9-anexos`, ni nada bajo `generated/` (se regenera con make).
- **Editar siempre los archivos fuente** en `sections/<seccion>/content/*.md`, nunca los merged de `generated/markdown/`.

## Fase 0 — Preparación (una vez por ejecución)

1. Lee el ledger (o créalo).
2. Ejecuta `make merge-all-r` para tener los merged frescos.
3. Lee `lib/components/drs/prompts/dimensions.md` y el skill `academic-writing-style` para tenerlos como criterios de referencia.
4. Verifica que el árbol git esté limpio; si hay cambios sin commitear ajenos al loop, commitéalos aparte antes de empezar (`wip: estado previo a finish-thesis`).

## Fase 1 — Ciclo por sección (secuencial)

Para cada sección pendiente, ejecuta los pasos a–f. Máximo **2 iteraciones** del ciclo c–e por sección; si tras la segunda quedan hallazgos altos, márcalos como `deuda` en el ledger y continúa (no te bloquees).

### a. Revisión DRS (triple-lens, en paralelo)

Lanza **3 agentes en paralelo** (un solo mensaje, tres llamadas a Agent, tipo general-purpose). Cada uno recibe:
- Su prompt completo: `lib/components/drs/prompts/advocate.md` | `analyst.md` | `adversary.md`
- Las dimensiones: `lib/components/drs/prompts/dimensions.md`
- El contenido: `generated/markdown/<seccion>.md`
- Instrucción de devolver la revisión completa en su formato de salida.

Guarda cada revisión en `generated/reports/drs/reviews/<reviewer>/<seccion>.md`.

### b. Síntesis

Lanza 1 agente con `lib/components/drs/prompts/synthesizer.md` + las tres revisiones. Guarda en `generated/reports/drs/synthesis/<seccion>.md`. Extrae la lista priorizada de acciones (crítica / alta / media / baja).

### c. Reescritura profunda

Aplica las acciones de severidad **crítica, alta y media** directamente sobre `sections/<seccion>/content/*.md`. Reglas:
- Reescribe con valentía los pasajes débiles: reestructura párrafos, refuerza argumentos, elimina redundancias. No te limites a parches cosméticos.
- Cumple estrictamente el skill `academic-writing-style`.
- **Preserva todas las citas APA y notas al pie textualmente.** Si un argumento necesita evidencia que no existe, marca `<!-- TODO-EVIDENCIA: ... -->` en vez de inventar fuentes.
- No cambies la estructura de encabezados salvo que la síntesis lo pida explícitamente.
- Documenta cada cambio relevante en `generated/reports/finish-thesis/cambios/<seccion>.md` (qué, dónde, por qué, hallazgo que resuelve).

Si la sección es larga, reparte los archivos de `content/` entre varios agentes en paralelo, cada uno con la síntesis + las reglas de estilo + sus archivos asignados.

### d. Pulido de estilo IRA

1. Lanza el agente `diagnostic_agent` sobre los archivos reescritos → informe de patrones.
2. Con ese informe, lanza `architect_agent` (ritmo, variación estructural) y después `voice_agent` (vocabulario, matiz, voz académica) sobre los pasajes señalados.
3. Los agentes editan los mismos archivos fuente; verifica después que ninguna cita se haya alterado (compara el conjunto de citas antes/después; si falta alguna, restáurala).

### e. Verificación

1. `make merge-section <seccion>` para regenerar el merged.
2. Lanza 1 agente re-revisor con el prompt de `analyst.md` + la síntesis original, preguntando: ¿qué hallazgos críticos/altos siguen sin resolver? ¿La reescritura introdujo problemas nuevos?
3. Si quedan críticos/altos y `iterations < 2` → vuelve a (c) con esos hallazgos como plan. Si no → continúa.

### f. Cierre de sección

1. `git add sections/<seccion> generated/reports` y commit: `finish-thesis: <seccion> — ciclo <n> completado`.
2. Actualiza ledger y log. Anuncia en una línea el resultado (hallazgos resueltos / deuda restante) y pasa a la siguiente sección **sin pedir permiso**.

## Fase 2 — Consistencia global (cuando las 7 secciones estén done)

1. `make merge-all-r`.
2. Lanza 3 agentes en paralelo con `lib/components/drs/prompts/global.md` como guía, cada uno especializado:
   - **Terminología**: construye el mapa de términos clave a lo largo de los 7 merged; detecta inconsistencias de uso o definición.
   - **Arco narrativo**: ¿cada promesa/pregunta de `1-introduccion` se cumple en `6-discusion`/`7-conclusiones`? ¿Las conclusiones se derivan de la evidencia presentada? Lista promesas incumplidas y conclusiones huérfanas.
   - **Contradicciones y transiciones**: afirmaciones incompatibles entre capítulos, repeticiones inter-capítulo, calidad de las transiciones entre secciones.
3. Sintetiza los tres informes en `generated/reports/finish-thesis/global-synthesis.md`, aplica las correcciones críticas/altas sobre los fuente, re-verifica con una pasada rápida y commitea (`finish-thesis: consistencia global`).

## Fase 3 — Cierre

1. `make compile-all`; si falla, corrige y reintenta hasta que compile.
2. Escribe `generated/reports/finish-thesis/FINAL_REPORT.md`: estado por sección (hallazgos resueltos, deuda restante con severidad), resultado de la pasada global, lista de `TODO-EVIDENCIA` pendientes, y las preguntas de defensa más probables recopiladas de las síntesis.
3. Commit final y resumen al usuario: qué se logró, qué deuda queda y dónde está cada informe.

## Reglas de seguridad

- Nunca edites `generated/` a mano; nunca toques `8-bibliografia`.
- Nunca inventes citas, datos ni fuentes; usa `TODO-EVIDENCIA`.
- Un commit por sección como mínimo — es el mecanismo de rollback.
- Si un agente falla, reintenta una vez; si vuelve a fallar, registra el fallo en el log y continúa con lo que tengas.
- Si el contexto se agota a mitad de proceso, el ledger permite retomar: es más importante actualizarlo que avanzar rápido.
