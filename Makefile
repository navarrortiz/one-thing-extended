.PHONY: clean install schemas

PREFIX ?= ${HOME}/.local

UUID   ?= one-thing-extended@navarrortiz.github.io
BUNDLE = ${UUID}.zip

ASSETS  = $(wildcard assets/*)
SCHEMAS = $(wildcard schemas/*.gschema.xml)
MODULES = $(shell find src -type f | sort)
SOURCES = ${ASSETS} ${SCHEMAS} LICENSE extension.js \
	  metadata.json prefs.js stylesheet.css ${MODULES}

${BUNDLE}: ${SOURCES} schemas/gschemas.compiled
	rm -f "$@"
	zip -q "$@" ${SOURCES}

schemas/gschemas.compiled: ${SCHEMAS}
	glib-compile-schemas schemas/

clean:
	rm -f "${BUNDLE}"
	rm -f schemas/gschemas.compiled

install: ${BUNDLE}
	rm -rf "${PREFIX}/share/gnome-shell/extensions/${UUID}"
	mkdir -p "${PREFIX}/share/gnome-shell/extensions/${UUID}"
	unzip  -q "${BUNDLE}" -d "${PREFIX}/share/gnome-shell/extensions/${UUID}"
	glib-compile-schemas "${PREFIX}/share/gnome-shell/extensions/${UUID}/schemas"

schemas: schemas/gschemas.compiled
