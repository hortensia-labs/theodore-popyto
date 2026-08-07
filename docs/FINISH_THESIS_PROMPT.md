# Finish Thesis — Prompt Maestro y Expectativa Final

Este documento acompaña al skill `/finish-thesis` (`.claude/skills/finish-thesis/SKILL.md`). Contiene: (1) cómo usar el sistema, (2) el prompt maestro autocontenido para pegar en cualquier sesión si prefieres no usar el skill, (3) la Expectativa Final detallada, y (4) los parámetros ajustables.

---

## 1. Uso recomendado

```
/finish-thesis
```

Eso es todo. El loop es **autónomo y reanudable**:

- Lee su estado en `generated/reports/finish-thesis/ledger.json` y retoma donde quedó.
- Procesa las secciones 1–7 secuencialmente; dentro de cada sección lanza los revisores en paralelo.
- Hace un commit de git por sección (mecanismo de rollback: `git log --oneline | grep finish-thesis`).
- Al terminar deja el informe ejecutivo en `generated/reports/finish-thesis/FINAL_REPORT.md`.

Si la sesión se corta o se agota el contexto, simplemente vuelve a invocar `/finish-thesis` en una sesión nueva.

**Consejo de eficiencia**: ejecuta cada sesión con la instrucción "procesa todas las secciones que puedas" y déjalo trabajar. Una sección completa (3 reviews + síntesis + reescritura + IRA + verificación) es un ciclo largo; espera 1–3 secciones por sesión según su tamaño.

## 2. Prompt maestro (versión autocontenida para pegar)

> Actúa como director del proceso de finalización de mi tesis doctoral "Resistencia Encarnada". Objetivo: llevar cada sección (1-introduccion … 7-conclusiones) a la Expectativa Final mediante un loop autónomo. No pidas confirmación entre secciones.
>
> **Estado**: lee/crea `generated/reports/finish-thesis/ledger.json` y retoma desde la primera sección no terminada.
>
> **Por cada sección**: (a) lanza en paralelo 3 agentes revisores con los prompts de `lib/components/drs/prompts/` (advocate, analyst, adversary) + `dimensions.md` sobre `generated/markdown/<seccion>.md`, guardando en `generated/reports/drs/reviews/<reviewer>/<seccion>.md`; (b) sintetiza con `synthesizer.md` → `generated/reports/drs/synthesis/<seccion>.md`; (c) reescribe en profundidad los archivos fuente `sections/<seccion>/content/*.md` aplicando los hallazgos críticos/altos/medios, siguiendo el skill `academic-writing-style`, preservando todas las citas textualmente y marcando `<!-- TODO-EVIDENCIA -->` donde falte respaldo (nunca inventes fuentes); (d) pasa el pipeline IRA: diagnostic_agent → architect_agent → voice_agent sobre lo reescrito, y verifica que ninguna cita se perdió; (e) regenera con `make merge-section <seccion>` y re-verifica con un agente analyst: si quedan hallazgos críticos/altos y llevas menos de 2 iteraciones, repite c–e; (f) commitea (`finish-thesis: <seccion>`), actualiza el ledger y sigue con la siguiente.
>
> **Al terminar las 7**: pasada global con `lib/components/drs/prompts/global.md` — 3 agentes paralelos (terminología, arco narrativo intro↔conclusiones, contradicciones/transiciones) —, aplica correcciones, commitea. Después `make compile-all` hasta que compile sin errores y escribe `generated/reports/finish-thesis/FINAL_REPORT.md` con estado por sección, deuda restante, TODOs de evidencia y preguntas de defensa probables.
>
> **Reglas**: edita solo los fuente de `sections/*/content/`, nunca `generated/` ni `8-bibliografia`; un commit por sección; si un agente falla dos veces, regístralo y continúa.

## 3. Expectativa Final (Definition of Done)

### Por sección

| Dimensión | Criterio de aceptación | Cómo se verifica |
|---|---|---|
| Rigor argumentativo | 0 hallazgos críticos o altos sin resolver en la re-revisión | Re-review analyst contra la síntesis DRS |
| Estilo y voz | 0 patrones de severidad alta en el diagnóstico IRA; prosa conforme a `academic-writing-style` | diagnostic_agent tras la reescritura |
| Integridad de contenido | Conjunto de citas idéntico antes/después; significado y contribuciones preservadas | Comparación de citas pre/post reescritura |
| Trazabilidad | Reviews, síntesis, informe de cambios y commit existen | Archivos en `generated/reports/` + `git log` |

Los hallazgos altos que sobrevivan a 2 iteraciones se registran como **deuda** en el ledger y en el informe final — el loop no se bloquea, pero la deuda queda visible para decisión humana.

### Global (tesis completa)

- Terminología clave usada de forma consistente en los 7 capítulos (mapa terminológico sin conflictos).
- Toda pregunta/promesa de la introducción tiene respuesta explícita en discusión o conclusiones; ninguna conclusión carece de base en la evidencia presentada.
- Sin contradicciones entre capítulos; transiciones inter-capítulo presentes.
- `make compile-all` genera los 10 ICML sin errores.
- `FINAL_REPORT.md` existe con: estado por sección, deuda priorizada, lista `TODO-EVIDENCIA`, preguntas de defensa probables.

### Qué queda explícitamente FUERA del loop

- **Citas y bibliografía (CRV)**: validación de DOIs/URLs y formato APA — ejecutar aparte con `make validate-citations` cuando lo decidas.
- Secciones `0-covermatter`, `8-bibliografia`, `9-anexos`.
- Maquetación en InDesign más allá de generar los ICML.

## 4. Parámetros ajustables

Edita `.claude/skills/finish-thesis/SKILL.md` para cambiar:

| Parámetro | Valor actual | Dónde |
|---|---|---|
| Iteraciones máximas por sección | 2 | Fase 1, encabezado |
| Severidades que disparan reescritura | crítica + alta + media | Fase 1c |
| Severidades que bloquean el done | crítica + alta | Expectativa Final |
| Secciones incluidas | 1–7 | Alcance |
| Commits automáticos | por sección | Fase 1f (elimínalo si prefieres commitear tú) |
| Pipeline IRA | diagnostic → architect → voice | Fase 1d (puedes añadir verification_agent como gate extra) |

## 5. Registro de artefactos

```
generated/reports/finish-thesis/
├── ledger.json              # Estado del loop (reanudación)
├── log.md                   # Log humano, una línea por evento
├── cambios/<seccion>.md     # Qué se cambió y por qué, por sección
├── global-synthesis.md      # Síntesis de la pasada de consistencia global
└── FINAL_REPORT.md          # Informe ejecutivo final

generated/reports/drs/
├── reviews/{advocate,analyst,adversary}/<seccion>.md
└── synthesis/<seccion>.md
```
