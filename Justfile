# ============================================================================
# Sistema de Compilación Editorial - Libros de Teatro Musical
# ============================================================================
#
# Uso: just <recipe> [argumentos]
# Ayuda: just help | just --list
#
# Libros definidos en build.config.json (configuración dinámica).
# Ver libros disponibles: just list-books
# ============================================================================

# Configuración por defecto
set shell := ["bash", "-cu"]

# Variables
project_root := justfile_directory()
lib_dir := project_root / "lib"
config_file := project_root / "build.config.json"
gum_helpers := lib_dir / "gum-helpers.sh"

# Log helper for single-line recipes (no source needed)
log := lib_dir / "log.sh"

# Book IDs — from build.config.json (fallback if script fails)
books := `python3 {{lib_dir}}/get-book-ids.py 2>/dev/null || echo "libro1 libro2"`

# Validates that the book parameter is a valid book ID
[private]
_validate-book book:
    @python3 {{lib_dir}}/get-book-ids.py 2>/dev/null | grep -qw "{{book}}" || (echo "Error: Invalid book '{{book}}'. Run 'just list-books' for valid options." >&2; exit 1)

# ============================================================================
# COMANDOS PRINCIPALES
# ============================================================================

# Muestra ayuda detallada del sistema de compilación
[group('help')]
help:
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    banner "Sistema de Compilación Editorial"
    if $HAS_GUM; then
        gum format << 'EOF'
    ## Compilación
    - `just compile <book>` — Compila un libro (ej: libro1, libro2)
    - `just compile-all` — Compila todos los libros configurados
    - `just compile-if-needed <book>` — Compila solo si hay archivos stale
    - `just compile-all-if-needed` — Compila libros que necesiten recompilación

    ## Compilación Granular
    - `just merge <book>` — Solo merge markdown
    - `just icml <book>` — Solo conversión ICML
    - `just resize-images <book>` — Ajusta dimensiones de imágenes ICML
    - `just scan <book>` — Solo escaneo de registros

    ## Capítulos Individuales
    - `just compile-chapter <book> <chapter>` (ej: phdbook 3-fundamentos-1)

    ## Validación
    - `just validate <book>` — Valida cross-refs
    - `just validate-all` — Valida todos los libros

    ## InDesign *(requiere InDesign abierto con libro)*
    - `just indesign-config <book>` — Genera config para JSX
    - `just update-links` — Actualiza enlaces (libro abierto)
    - `just fix-hyperlinks <book>` — Corrige URLs de Pandoc
    - `just crossref-process <book>` — Convierte #anchors a cross-refs
    - `just update-book` — Sincroniza estilos, preflight
    - `just update-toc <book>` — Genera tabla de contenidos
    - `just reformat-bibliography <book>` — Aplica estilo bibliografía
    - `just indesign-full <book>` — Pipeline InDesign completo

    ## Publicación
    - `just publish <book>` — Compilación + InDesign completo
    - `just publish-all` — Publica todos los libros (secuencial)
    - `just pphd` — Atajo para publish phdbook

    ## Utilidades
    - `just list <book>` — Lista capítulos de un libro
    - `just list-all` — Lista capítulos de todos los libros
    - `just clean <book>` — Limpia generados
    - `just clean-all` — Limpia todos los generados

    ## Desarrollo
    - `just compile-logged <book>` — Compila y guarda log a archivo
    - `just publish-logged <book>` — Publica y guarda log a archivo
    - `just check-deps` — Verifica dependencias del sistema

    ## Información
    - `just list-books` — Lista libros configurados (build.config.json)
    - `just status` — Estado del proyecto por libro
    - `just --list` — Lista todas las recetas

    *<book> = ID de libro desde build.config.json (ej: phdbook)*
    EOF
    else
        cat << 'EOF'
    COMPILACIÓN:
      just compile <book>            Compila un libro (ej: libro1, libro2)
      just compile-all               Compila todos los libros configurados
      just compile-if-needed <book>  Compila solo si hay archivos stale
      just compile-all-if-needed     Compila libros que necesiten recompilación

    COMPILACIÓN GRANULAR:
      just merge <book>           Solo merge markdown
      just icml <book>            Solo conversión ICML
      just resize-images <book>   Ajusta dimensiones de imágenes ICML
      just scan <book>            Solo escaneo de registros

    CAPÍTULOS INDIVIDUALES:
      just compile-chapter <book> <chapter>   (ej: phdbook 3-fundamentos-1)

    VALIDACIÓN:
      just validate <book>        Valida cross-refs
      just validate-all           Valida todos los libros

    INDESIGN (requiere InDesign abierto con libro):
      just indesign-config <book>     Genera config para JSX
      just update-links               Actualiza enlaces (libro abierto)
      just fix-hyperlinks <book>      Corrige URLs de Pandoc
      just crossref-process <book>    Convierte #anchors a cross-refs
      just update-book                Sincroniza estilos, preflight
      just update-toc <book>           Genera tabla de contenidos
      just reformat-bibliography <book>  Aplica estilo bibliografía
      just indesign-full <book>       Pipeline InDesign completo

    PUBLICACIÓN:
      just publish <book>         Compilación + InDesign completo
      just publish-all            Publica todos los libros (secuencial)
      just pphd                   Atajo para publish phdbook

    UTILIDADES:
      just list <book>            Lista capítulos de un libro
      just list-all               Lista capítulos de todos los libros
      just clean <book>           Limpia generados
      just clean-all              Limpia todos los generados

    DESARROLLO:
      just compile-logged <book>    Compila y guarda log a archivo
      just publish-logged <book>    Publica y guarda log a archivo
      just check-deps               Verifica dependencias del sistema

    INFORMACIÓN:
      just list-books             Lista libros configurados (build.config.json)
      just status                 Estado del proyecto por libro
      just --list                 Lista todas las recetas

    <book> = ID de libro desde build.config.json (ej: phdbook)
    EOF
    fi

# Muestra estado del proyecto
[group('info')]
status:
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    heading "Estado del Proyecto"
    echo ""
    for book in $(python3 {{lib_dir}}/get-book-ids.py 2>/dev/null); do
        heading "$book:"
        python3 {{lib_dir}}/book-status.py "$book" --summary
        echo ""
    done

# Lista libros configurados
[group('info')]
list-books:
    @python3 {{lib_dir}}/get-book-ids.py 2>/dev/null | tr ' ' '\n' || echo "Could not load config"

# ============================================================================
# COMPILACIÓN COMPLETA
# ============================================================================

# Compila un libro completo (merge + icml + scan + validate)
[group('compile')]
compile book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    info "Compilando {{book}}..."
    echo ""

    step "1/6" "Merge de archivos markdown..."
    just merge {{book}}
    echo ""

    step "2/6" "Conversión a ICML..."
    just icml {{book}}
    echo ""

    step "3/6" "Aplicando mappings de estilos..."
    just restyle-icml {{book}}
    echo ""

    step "4/6" "Ajustando dimensiones de imágenes..."
    just resize-images {{book}}
    echo ""

    step "5/6" "Escaneo de registros..."
    just scan {{book}}
    echo ""

    step "6/6" "Validación de cross-references..."
    just validate {{book}}
    echo ""

    success "{{book}} compilado exitosamente!"

# Compila todos los libros
[group('compile')]
compile-all:
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    info "Compilando todos los libros..."
    first=true
    for book in {{books}}; do
        if $first; then first=false; else echo ""; separator; echo ""; fi
        just compile "$book"
    done
    echo ""
    success "Todos los libros compilados exitosamente!"

# Compila un libro solo si hay archivos que necesitan recompilación
[group('compile')]
compile-if-needed book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    if python3 {{lib_dir}}/book-status.py {{book}} --check-stale --config {{config_file}}; then
        just compile {{book}}
    else
        info "{{book}}: todo al día, nada que compilar."
    fi

# Compila todos los libros que tengan archivos stale
[group('compile')]
compile-all-if-needed:
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    compiled=0
    for book in {{books}}; do
        if python3 {{lib_dir}}/book-status.py "$book" --check-stale --config {{config_file}}; then
            just compile "$book"
            compiled=$((compiled + 1))
        fi
    done
    if [[ $compiled -eq 0 ]]; then
        info "Todos los libros están al día."
    else
        success "$compiled libro(s) recompilado(s)."
    fi

# Compila un capítulo específico
[group('compile')]
compile-chapter book chapter: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    info "Compilando {{chapter}} de {{book}}..."
    python3 {{lib_dir}}/compile-chapter.py {{book}} {{chapter}}
    success "{{chapter}} compilado!"

# ============================================================================
# PASOS INDIVIDUALES
# ============================================================================

# Merge: copia y normaliza archivos markdown
[group('steps')]
merge book: (_validate-book book)
    @bash {{log}} info "Merge de {{book}}..."
    @python3 {{lib_dir}}/merge-book.py {{book}} --config {{config_file}}

# ICML: convierte markdown a ICML via Pandoc
[group('steps')]
icml book: (_validate-book book)
    @bash {{log}} info "Conversión ICML de {{book}}..."
    @python3 {{lib_dir}}/compile-icml.py {{book}} --config {{config_file}}

# Scan: genera registros de cross-refs, hyperlinks, citations
[group('steps')]
scan book: (_validate-book book)
    @bash {{log}} info "Escaneando {{book}}..."
    @python3 {{lib_dir}}/scan-book.py {{book}} --config {{config_file}}

# ============================================================================
# VALIDACIÓN
# ============================================================================

# Valida cross-references de un libro
[group('validate')]
validate book: (_validate-book book)
    @bash {{log}} info "Validando {{book}}..."
    @python3 {{lib_dir}}/validate-book.py {{book}} --config {{config_file}}

# Valida cross-references de todos los libros
[group('validate')]
validate-all:
    #!/usr/bin/env bash
    set -euo pipefail
    for book in {{books}}; do
        just validate "$book"
    done

# ============================================================================
# LISTADOS
# ============================================================================

# Lista capítulos de un libro
[group('info')]
list book: (_validate-book book)
    @python3 {{lib_dir}}/list-book-chapters.py {{book}} --config {{config_file}}

# Lista capítulos de todos los libros
[group('info')]
list-all:
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    first=true
    for book in {{books}}; do
        if $first; then first=false; else echo ""; fi
        just list "$book"
    done

# ============================================================================
# LIMPIEZA
# ============================================================================

# Limpia archivos generados de un libro
[group('clean')]
clean book: (_validate-book book)
    #!/usr/bin/env bash
    set -uo pipefail
    source "{{gum_helpers}}"
    info "Limpiando generated/{{book}}/..."
    rm -rf generated/{{book}}/markdown/*.md 2>/dev/null || true
    rm -rf generated/{{book}}/icml/*.icml 2>/dev/null || true
    rm -rf generated/{{book}}/data/*.json 2>/dev/null || true
    success "{{book}} limpiado"

# Limpia todos los archivos generados
[group('clean')]
clean-all:
    #!/usr/bin/env bash
    set -uo pipefail
    source "{{gum_helpers}}"
    for book in {{books}}; do
        just clean "$book"
    done
    rm -rf generated/logs/*.log 2>/dev/null || true
    success "Todos los generados limpiados"

# ============================================================================
# DESARROLLO Y DEBUG
# ============================================================================

# Ejecuta merge en modo verbose
[group('dev')]
merge-verbose book: (_validate-book book)
    @python3 {{lib_dir}}/merge-book.py {{book}} --config {{config_file}} --verbose

# Ejecuta compilación ICML en modo verbose
[group('dev')]
icml-verbose book: (_validate-book book)
    @python3 {{lib_dir}}/compile-icml.py {{book}} --config {{config_file}} --verbose

# Ejecuta escaneo en modo verbose
[group('dev')]
scan-verbose book: (_validate-book book)
    @python3 {{lib_dir}}/scan-book.py {{book}} --config {{config_file}} --verbose

# Ejecuta validación en modo verbose
[group('dev')]
validate-verbose book: (_validate-book book)
    @python3 {{lib_dir}}/validate-book.py {{book}} --config {{config_file}} --verbose

# Muestra estado detallado de un libro
[group('dev')]
status-book book: (_validate-book book)
    @python3 {{lib_dir}}/book-status.py {{book}}

# Muestra configuración cargada
[group('dev')]
show-config:
    @python3 -c "import json; print(json.dumps(json.load(open('{{config_file}}')), indent=2))"

# Verifica que todas las dependencias estén instaladas
[group('dev')]
check-deps:
    #!/usr/bin/env bash
    set -uo pipefail
    source "{{gum_helpers}}"
    errors=0

    heading "Dependencias requeridas"

    # python3
    if command -v python3 >/dev/null 2>&1; then
        py_ver=$(python3 --version 2>&1 | awk '{print $2}')
        py_major=$(echo "$py_ver" | cut -d. -f1)
        py_minor=$(echo "$py_ver" | cut -d. -f2)
        if [[ "$py_major" -ge 3 && "$py_minor" -ge 9 ]]; then
            success "python3 $py_ver"
        else
            err "python3 $py_ver (se requiere 3.9+)"
            errors=$((errors + 1))
        fi
    else
        err "python3 no encontrado"
        errors=$((errors + 1))
    fi

    # pandoc
    if command -v pandoc >/dev/null 2>&1; then
        pandoc_ver=$(pandoc --version 2>&1 | head -1 | awk '{print $2}')
        pandoc_major=$(echo "$pandoc_ver" | cut -d. -f1)
        pandoc_minor=$(echo "$pandoc_ver" | cut -d. -f2)
        if [[ "$pandoc_major" -gt 2 || ("$pandoc_major" -eq 2 && "$pandoc_minor" -ge 19) ]]; then
            success "pandoc $pandoc_ver"
        else
            err "pandoc $pandoc_ver (se requiere 2.19+)"
            errors=$((errors + 1))
        fi
    else
        err "pandoc no encontrado"
        errors=$((errors + 1))
    fi

    # just (informational, since it's already running)
    just_ver=$(just --version 2>&1 | awk '{print $2}')
    success "just $just_ver"

    echo ""
    heading "Dependencias opcionales"

    # gum
    if command -v gum >/dev/null 2>&1; then
        gum_ver=$(gum --version 2>&1 | head -1)
        success "gum $gum_ver"
    else
        warn "gum no encontrado (output será sin estilo)"
    fi

    # osascript (macOS — solo para InDesign)
    if command -v osascript >/dev/null 2>&1; then
        success "osascript disponible (macOS, requerido para InDesign)"
    else
        warn "osascript no disponible (funciones InDesign no estarán disponibles)"
    fi

    echo ""
    heading "Archivos de configuración"

    # build.config.json
    if [[ -f "{{config_file}}" ]]; then
        if python3 -c "import json; json.load(open('{{config_file}}'))" 2>/dev/null; then
            success "build.config.json válido"
        else
            err "build.config.json existe pero tiene errores de JSON"
            errors=$((errors + 1))
        fi
    else
        err "build.config.json no encontrado en {{project_root}}"
        errors=$((errors + 1))
    fi

    # .env (informational)
    if [[ -f "{{project_root}}/.env" ]]; then
        info ".env presente (referencia, no requerido)"
    else
        info ".env no encontrado (opcional)"
    fi

    echo ""
    if [[ $errors -gt 0 ]]; then
        err "$errors error(es) encontrado(s)"
        exit 1
    fi
    success "Todas las dependencias verificadas"

# Prueba la configuración
[group('dev')]
test-config:
    @python3 {{lib_dir}}/config.py

# Compila un libro y guarda log a archivo
[group('dev')]
compile-logged book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p generated/logs
    logfile="generated/logs/compile-{{book}}-$(date +%Y%m%d-%H%M%S).log"
    just compile {{book}} 2>&1 | tee "$logfile"
    echo ""
    echo "Log guardado en: $logfile"

# Publica un libro y guarda log a archivo
[group('dev')]
publish-logged book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p generated/logs
    logfile="generated/logs/publish-{{book}}-$(date +%Y%m%d-%H%M%S).log"
    just publish {{book}} 2>&1 | tee "$logfile"
    echo ""
    echo "Log guardado en: $logfile"

# ============================================================================
# ALIASES (atajos convenientes)
# ============================================================================

# Alias: c = compile
alias c := compile

# Alias: phd = compile phdbook
[group('shortcuts')]
phd: (compile "phdbook")

# Alias: all = compile-all
alias all := compile-all

# Alias: m = merge
alias m := merge

# Alias: v = validate
alias v := validate

# ============================================================================
# INTEGRACIÓN CON INDESIGN
# ============================================================================
# Requiere:
#   - macOS (AppleScript)
#   - Adobe InDesign 2021+
#   - Libro InDesign abierto (.indb)
# ============================================================================

# Genera archivo de configuración para scripts JSX
[group('indesign')]
indesign-config book: (_validate-book book)
    @bash {{log}} info "Generando configuración InDesign para {{book}}..."
    @python3 {{lib_dir}}/generate-indesign-config.py {{book}} --config {{config_file}}

# Actualiza enlaces desactualizados (opera sobre el libro abierto en InDesign)
[group('indesign')]
update-links:
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    echo ""
    warn "IMPORTANTE: Esta operación actúa sobre el libro actualmente abierto en InDesign."
    echo ""
    osascript {{lib_dir}}/adobe/update-links-of-book-documents.applescript

# Corrige hipervínculos URL malformados por Pandoc
[group('indesign')]
fix-hyperlinks book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    info "Corrigiendo hipervínculos URL de {{book}}..."
    just indesign-config {{book}}
    osascript {{lib_dir}}/adobe/runner.applescript "hyperlink-process.jsx" "{{book}}"

# Procesa cross-references: convierte #anchors a cross-refs nativos
[group('indesign')]
crossref-process book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    info "Procesando cross-references de {{book}}..."
    just indesign-config {{book}}
    osascript {{lib_dir}}/adobe/runner.applescript "crossref-process.jsx" "{{book}}"

# Sincroniza estilos, numeración y preflight (opera sobre el libro abierto en InDesign)
[group('indesign')]
update-book:
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    echo ""
    warn "IMPORTANTE: Esta operación actúa sobre el libro actualmente abierto en InDesign."
    echo ""
    if $HAS_GUM; then
        gum spin --spinner dot --title "Sincronizando libro..." --show-output -- \
            osascript {{lib_dir}}/adobe/book-sync-update-preflight.applescript
    else
        osascript {{lib_dir}}/adobe/book-sync-update-preflight.applescript
    fi

# Genera/actualiza tabla de contenidos
[group('indesign')]
update-toc book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"
    info "Actualizando TOC de {{book}}..."

    # Read TOC config via config module
    TOC_DOC=$(python3 -c "import sys; sys.path.insert(0,'{{lib_dir}}'); from config import load_config, get_book_config; b=get_book_config(load_config(),'{{book}}'); print(b.indesign.toc_document)")
    TOC_STYLE=$(python3 -c "import sys; sys.path.insert(0,'{{lib_dir}}'); from config import load_config, get_book_config; b=get_book_config(load_config(),'{{book}}'); print(b.indesign.toc_style)")

    info "Documento TOC: $TOC_DOC"
    info "Estilo TOC: $TOC_STYLE"

    osascript {{lib_dir}}/adobe/update-toc.applescript "$TOC_DOC" "$TOC_STYLE"

# Aplica estilo de bibliografía al archivo ICML
[group('indesign')]
reformat-bibliography book: (_validate-book book)
    @bash {{log}} info "Reformateando bibliografía de {{book}}..."
    @python3 {{lib_dir}}/format-bibliography-icml.py {{book}} --config {{config_file}}

# Aplica mappings de estilos personalizados a archivos ICML
[group('indesign')]
restyle-icml book: (_validate-book book)
    @bash {{log}} info "Aplicando mappings de estilos de {{book}}..."
    @python3 {{lib_dir}}/restyle-icml.py {{book}} --config {{config_file}}

# Ajusta dimensiones de imágenes ancladas en archivos ICML
[group('indesign')]
resize-images book: (_validate-book book)
    @bash {{log}} info "Ajustando imágenes ICML de {{book}}..."
    @python3 {{lib_dir}}/resize-icml-images.py {{book}} --config {{config_file}}

# Pipeline InDesign completo (requiere InDesign abierto con libro)
[group('indesign')]
indesign-full book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"

    banner "Pipeline InDesign — {{book}}"
    warn "IMPORTANTE: InDesign debe estar ejecutándose con {{book}}.indb abierto."
    warn "Los pasos update-links y update-book operan sobre el libro abierto en InDesign."
    echo ""

    step "1/5" "Actualizando enlaces..."
    just update-links
    echo ""

    step "2/5" "Corrigiendo hipervínculos URL..."
    just fix-hyperlinks {{book}}
    echo ""

    step "3/5" "Procesando cross-references..."
    just crossref-process {{book}}
    echo ""

    step "4/5" "Sincronizando libro (estilos, numeración, preflight)..."
    just update-book
    echo ""

    step "5/5" "Actualizando tabla de contenidos..."
    just update-toc {{book}}
    echo ""

    success "Pipeline InDesign de {{book}} completado!"

# ============================================================================
# PUBLICACIÓN
# ============================================================================

# Publicación completa: compilación + bibliografía + InDesign
[group('publish')]
publish book: (_validate-book book)
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"

    banner "Publicación Completa — {{book}}"

    phase "$COLOR_COMPILE" "FASE 1: Compilación"
    just compile {{book}}
    echo ""

    phase "$COLOR_BIBLIO" "FASE 2: Formateo de Bibliografía"
    just reformat-bibliography {{book}}
    echo ""

    phase "$COLOR_INDESIGN" "FASE 3: Pipeline InDesign"
    just indesign-full {{book}}
    echo ""

    success "Publicación de {{book}} completada!"

# Publica todos los libros (secuencial, requiere cambio manual de libro en InDesign)
[group('publish')]
publish-all:
    #!/usr/bin/env bash
    set -euo pipefail
    source "{{gum_helpers}}"

    all_books=({{books}})
    total=${#all_books[@]}

    banner "Publicación de Todos los Libros"
    info "NOTA: InDesign solo puede tener un libro abierto a la vez."
    info "Se procesarán $total libros secuencialmente."
    echo ""

    for i in "${!all_books[@]}"; do
        book="${all_books[$i]}"
        num=$((i + 1))

        # Prompt for confirmation between books (not before the first one)
        if [[ $i -gt 0 ]]; then
            echo ""
            separator
            success "${all_books[$((i-1))]} completado."
            echo ""

            if $HAS_GUM; then
                gum confirm "¿Continuar con $book? (Abra ${book}.indb en InDesign)" \
                    --affirmative "Sí, continuar" --negative "Cancelar" \
                    || { warn "Publicación cancelada por el usuario."; exit 1; }
            else
                echo "⚠️  Ahora abra ${book}.indb en InDesign y presione Enter para continuar..."
                read -p ""
            fi
        fi

        just publish "$book"
    done

    echo ""
    success "Todos los libros publicados!"

# Alias: pub = publish
alias pub := publish

# Alias rápidos para publicación
[group('shortcuts')]
pphd: (publish "phdbook")
