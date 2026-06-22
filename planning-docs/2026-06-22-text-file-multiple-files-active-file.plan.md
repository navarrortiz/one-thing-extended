# Plan: Multiples archivos para provider Text file

## Objetivo

Permitir configurar varios archivos de texto para el provider `Text file`, elegir un archivo activo desde preferencias y desde el popover, y hacer que el provider use siempre el archivo activo para lectura, apertura, vista previa, monitoreo y controles de ejecucion.

## Contexto y Reglas

- El usuario quiere seleccionar multiples archivos de texto cuando el provider activo sea `Text file`.
- El usuario quiere definir explicitamente cual archivo de texto esta activo.
- Decision aprobada: el archivo activo debe poder cambiarse tanto desde settings como desde el popover.
- El runtime debe seguir usando un unico archivo activo a la vez.
- El popover debe permitir cambiar rapidamente el archivo activo sin abrir preferencias.
- La UI de preferencias debe permitir agregar varios archivos, quitar archivos y elegir el activo.
- El comportamiento existente de `Text file` debe conservarse para el archivo activo: leer primera linea no vacia, mostrar proximas lineas, abrir archivo, monitorear cambios y completar things en ejecucion.
- Debe existir compatibilidad con la configuracion actual `text-file-path` para no romper usuarios existentes.
- El plan recomienda agregar claves nuevas para lista de archivos y archivo activo, manteniendo `text-file-path` como fuente de migracion o fallback.
- La migracion debe evitar duplicados y debe conservar como activo el archivo que ya estuviera configurado en `text-file-path`.
- Si no hay archivo activo valido, el provider debe comportarse como hoy ante ruta vacia: no romper la extension y mostrar valor vacio o datos de popover vacios.
- Si el archivo activo se elimina de la lista, debe seleccionarse otro archivo disponible o dejar el activo vacio de forma explicita.
- El `Gio.FileMonitor` debe observar solo el archivo activo.
- Cambiar el archivo activo debe resincronizar `thing-value`, reemplazar el monitor anterior y refrescar datos del popover.
- Si hay una ejecucion `Running` o `Paused`, cambiar el archivo activo debe tratarse como cambio externo del current thing y no debe completar un thing contra el archivo equivocado.
- El usuario quiere renombrar el concepto `task` a `thing` visualmente y en codigo.
- La UI debe hablar de `Thing Provider`, no de `Task Provider`.
- El codigo debe usar nombres tipo `ThingProvider`, no `TaskProvider`, para clases, managers, factories, helpers y constantes donde aplique.
- El cambio de multiples archivos debe hacerse sobre la nomenclatura nueva de `Thing Provider`.
- El plan se basa en la arquitectura actual: schema en `schemas/`, constantes en `src/shared/constants.js`, helpers de archivo en `src/extension/taskProviders/textFileUtils.js`, provider en `src/extension/taskProviders/textFile.js`, manager en `src/extension/taskProviderManager.js`, preferencias en `src/prefs/groups/provider.js` y popover en `src/ui/widget.js`; esos nombres actuales deben renombrarse durante la implementacion.

## Tareas

### Schema y constantes

[x] Renombrar claves, constantes y comentarios nuevos para usar `thing` en lugar de `task` cuando representen el concepto de provider.
[x] Definir estrategia para claves GSettings existentes que contienen `task`, manteniendo compatibilidad si ya estan publicadas en el schema.
[x] Agregar una clave GSettings para la lista de archivos de texto, por ejemplo `text-file-paths` de tipo `as`.
[x] Agregar una clave GSettings para el archivo activo, por ejemplo `text-file-active-path` de tipo `s`.
[x] Mantener `text-file-path` en el schema como compatibilidad con configuraciones existentes.
[x] Actualizar `SETTINGS_KEYS` con las nuevas claves.
[x] Documentar en comentarios del schema que `text-file-path` es compatibilidad o fallback.
[x] Verificar que los valores por defecto sean lista vacia y activo vacio.

### Renombrado Task a Thing

[x] Renombrar modulos y archivos de provider de `taskProviders` a `thingProviders` donde el cambio sea viable sin romper imports.
[x] Renombrar `TaskProviderManager` a `ThingProviderManager`.
[x] Renombrar `TextFileTaskProvider` a `TextFileThingProvider`.
[x] Renombrar factories y helpers como `createTaskProvider`, `getActiveTaskProviderName` e `isTextFileTaskProvider` a equivalentes `ThingProvider`.
[x] Renombrar constantes como `TASK_PROVIDERS` y `TASK_EXECUTION_STATES` a equivalentes `THING_*`.
[x] Actualizar imports en extension, UI y preferencias para usar la nomenclatura `thing`.
[x] Cambiar textos visibles de preferencias de `Task Provider` a `Thing Provider`.
[x] Revisar comentarios, JSDoc y logs para reemplazar `task` por `thing` cuando se refiera al dominio de la extension.
[x] Mantener nombres de claves GSettings existentes solo cuando sea necesario por compatibilidad, documentando el motivo.

### Modelo y helpers de Text File

[x] Crear helpers enfocados para leer la lista configurada, normalizar rutas y eliminar duplicados.
[x] Crear helper para obtener el archivo activo desde `text-file-active-path`.
[x] Implementar fallback desde `text-file-path` cuando la lista nueva este vacia.
[x] Implementar migracion liviana para copiar `text-file-path` a la lista nueva y marcarlo como activo cuando aplique.
[x] Mantener `getConfiguredTextFile(settings)` como API compatible que devuelva `Gio.File|null` del archivo activo.
[x] Agregar helpers para obtener metadatos del archivo activo: ruta, basename, existencia y capacidad de apertura.
[x] Asegurar que rutas vacias, espacios y duplicados no produzcan entradas invalidas.

### Provider y ejecucion

[x] Confirmar que `TextFileThingProvider` siga operando solo sobre `getConfiguredTextFile(settings)`.
[x] Verificar que `getCurrentThing()` y `getNextThings()` lean exclusivamente el archivo activo.
[x] Verificar que `startCurrentThing()` valide el archivo activo.
[x] Verificar que `stopCurrentThing()` escriba solamente en el archivo activo asociado al momento de completar.
[x] Guardar suficiente contexto de ejecucion para detectar si el archivo activo cambio mientras un thing estaba `Running` o `Paused`.
[x] Bloquear `Stop` con error claro si la ejecucion empezo en un archivo y el activo actual es otro.
[x] Permitir `Discard` aunque el archivo activo haya cambiado.

### Runtime y manager

[x] Hacer que `ThingProviderManager.openConfiguredTextFile()` abra el archivo activo.
[x] Hacer que `ThingProviderManager.getTextFilePopoverData()` devuelva tambien la lista de archivos configurados y el archivo activo.
[x] Incluir en los datos del popover un estado claro para archivo inexistente o no abrible.
[x] Cambiar `_syncTextFileMonitor()` para monitorear solo el archivo activo.
[x] Reemplazar el monitor cuando cambie la lista o el archivo activo.
[x] Sincronizar `thing-value` al cambiar el archivo activo.
[x] Conectar cambios de settings para `text-file-paths` y `text-file-active-path` en `src/extension/controller.js`.
[x] Evitar monitores duplicados al cambiar rapidamente entre archivos.
[x] Manejar cambios de archivo activo durante ejecucion como conflicto de ejecucion.

### Preferencias

[x] Reemplazar la fila unica de ruta por una UI de lista de archivos para `Text file`.
[x] Permitir agregar uno o varios archivos desde `Gtk.FileDialog`.
[x] Configurar el dialogo de archivos para permitir seleccion multiple si la version de GTK disponible lo soporta.
[x] Si seleccion multiple no esta disponible en la API objetivo, agregar archivos de a uno sin romper el flujo.
[x] Mostrar cada archivo configurado con nombre visible y ruta como detalle o tooltip.
[x] Permitir marcar un archivo como activo desde la lista de preferencias.
[x] Permitir eliminar un archivo de la lista.
[x] Al eliminar el archivo activo, elegir un nuevo activo de forma determinista o dejar activo vacio si no quedan archivos.
[x] Mantener visible la fila de limite de preview solo cuando el provider sea `Text file`.
[x] Mantener ocultos los controles de archivos cuando el provider no sea `Text file`.

### Popover

[x] Agregar un selector compacto del archivo activo en el bloque de `Text file`.
[x] Mostrar el archivo activo actual junto a la accion `Open`.
[x] Permitir cambiar el archivo activo desde el popover sin abrir settings.
[x] Actualizar inmediatamente `thing-value`, `Next Things` y sensibilidad de `Open` al cambiar el activo desde el popover.
[x] Mantener el bloque existente de ejecucion, `Open text file`, `Next Things` y `Settings`.
[x] Deshabilitar o mostrar estado vacio del selector cuando no haya archivos configurados.
[x] Evitar que el selector del popover aparezca para provider `Manual`.

### Manejo de errores

[x] Manejar lista vacia sin lanzar excepciones.
[x] Manejar archivo activo vacio sin romper la extension.
[x] Manejar archivo activo inexistente con `Open` deshabilitado y preview vacio.
[x] Manejar archivo sin permisos de lectura sin romper GNOME Shell.
[x] Manejar errores de escritura durante `Stop` sin dejar estado de ejecucion inconsistente.
[x] Manejar eliminacion del archivo activo desde settings o popover.
[x] Manejar conflicto si cambia el archivo activo mientras hay ejecucion activa.
[x] Evitar que errores de migracion bloqueen `enable` o `disable`.

### i18n

[x] Marcar como traducibles los textos nuevos de preferencias: agregar archivo, quitar archivo, archivo activo y sin archivos configurados.
[x] Marcar como traducibles los textos nuevos del popover para selector de archivo activo y estados vacios.
[x] Revisar que los textos nuevos sigan el patron de gettext existente.

### Calidad de codigo

[x] Mantener helpers de multiples archivos en modulos enfocados sin crecer demasiado `provider.js` ni `thingProviderManager.js`.
[x] Agregar JSDoc a helpers nuevos y a cualquier dato nuevo expuesto por el manager.
[x] Ejecutar `make schemas` o el comando equivalente para validar que el schema compila.
[x] Ejecutar `npm run compile` y corregir errores de empaquetado.
[ ] Run `tsc --noEmit` and fix all type errors.
[ ] Run `yarn lint` and fix all warnings/errors.
[x] Ejecutar `npm run lint` si `yarn lint` no esta disponible en este repo.

## Pasos de Verificacion Manual

1. Instalar o recargar la extension con el schema actualizado.
2. Abrir preferencias y cambiar provider a `Text file`.
3. Agregar tres archivos de texto desde settings.
4. Confirmar que se pueda marcar como activo cualquiera de los archivos agregados.
5. Confirmar que el panel muestre la primera linea no vacia del archivo activo.
6. Cambiar el archivo activo desde settings y confirmar que el panel se actualice.
7. Abrir el popover y cambiar el archivo activo desde el selector del popover.
8. Confirmar que `Open` abra el archivo activo actual.
9. Confirmar que `Next Things` muestre lineas del archivo activo actual.
10. Editar externamente el archivo activo y confirmar que el panel se actualice por monitor.
11. Editar externamente un archivo configurado que no este activo y confirmar que no cambie el panel.
12. Eliminar el archivo activo desde settings y confirmar que la UI seleccione otro activo o quede vacia sin romperse.
13. Configurar una instalacion que solo tenga `text-file-path` antiguo y confirmar que aparece en la lista nueva como activo.
14. Iniciar una ejecucion en un archivo, cambiar el activo desde el popover y confirmar que `Stop` no escriba en el archivo equivocado.
15. Con conflicto por cambio de archivo activo, confirmar que `Discard` cancela la ejecucion sin modificar archivos.
16. Probar archivo inexistente, archivo sin permisos y lista vacia; confirmar que la extension no se rompe.
17. Cambiar a provider `Manual` y confirmar que los controles de multiples archivos no aparecen.
