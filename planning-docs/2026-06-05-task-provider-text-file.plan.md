# Plan: Proveedor de tareas Text file

## Objetivo

Permitir que el valor mostrado de One Thing se obtenga desde un proveedor estático de tareas, manteniendo el comportamiento manual actual como proveedor por defecto e implementando el primer proveedor externo: `Text file`.

## Contexto y Reglas

- El usuario quiere que el valor de One Thing pueda obtenerse desde un proveedor de lista de tareas.
- La lista de proveedores será estática.
- El contrato inicial de un proveedor de tareas tendrá solo `getCurrentThing`.
- El primer proveedor a implementar será `Text file`.
- `Text file` debe leer la primera línea no vacía del archivo de texto configurado por el usuario.
- La configuración debe permitir seleccionar el proveedor activo.
- Para `Text file`, la configuración debe pedir al usuario el archivo de texto.
- El valor de `Text file` debe actualizarse automáticamente cuando cambie el archivo.
- Se aprueba usar `Gio.FileMonitor` para observar cambios del archivo, evitando polling.
- El comportamiento actual de escribir el valor manualmente debe conservarse como proveedor `Manual`.
- `Manual` será el proveedor por defecto para no romper usuarios existentes.
- El diseño elegido mantiene `thing-value` como valor visible enlazado a la UI actual.
- Un manager de proveedores será responsable de escoger proveedor, llamar `getCurrentThing` y actualizar `thing-value`.
- El contrato público del proveedor se mantiene limitado a `getCurrentThing`; la observación de archivos queda fuera del contrato y la gestiona la capa de runtime.
- La implementación debe manejar ruta vacía, archivo inexistente, archivo ilegible y archivo vacío sin romper GNOME Shell.
- Si el proveedor activo es `Text file`, al hacer click en el valor visible del panel debe abrirse el archivo de texto configurado.
- El comportamiento de click existente para `Manual` debe conservarse.
- El plan se basa en la arquitectura actual: schema en `schemas/`, constantes en `src/shared/constants.js`, runtime en `src/extension/`, prefs en `src/prefs/` y UI enlazada a `thing-value`.

## Tareas

### Configuración y constantes

[x] Agregar claves GSettings para `task-provider` y `text-file-path` en el schema.
[x] Actualizar `SETTINGS_KEYS` con las nuevas claves.
[x] Definir constantes estáticas para proveedores soportados, incluyendo `manual` y `text-file`.
[x] Verificar que el valor por defecto de `task-provider` sea `manual`.
[x] Actualizar documentación o comentarios necesarios para explicar los valores válidos del proveedor.

### Capa de proveedores

[x] Crear una carpeta o módulo de proveedores en `src/extension/` o `src/shared/` siguiendo la estructura existente.
[x] Implementar el proveedor `Manual` con `getCurrentThing`, devolviendo el valor actual de `thing-value`.
[x] Implementar el proveedor `Text file` con `getCurrentThing`, leyendo la primera línea no vacía del archivo configurado.
[x] Implementar un registro estático de proveedores para resolver el proveedor activo desde la configuración.
[x] Mantener el contrato de proveedor limitado a `getCurrentThing`.

### Manager de proveedores en runtime

[x] Crear un manager de proveedores que reciba `settings`, resuelva el proveedor activo y sincronice `thing-value`.
[x] Integrar el manager en `ExtensionController.enable`.
[x] Desconectar y destruir el manager en `ExtensionController.disable`.
[x] Sincronizar el valor al iniciar la extensión.
[x] Sincronizar el valor cuando cambie `task-provider`.
[x] Sincronizar el valor cuando cambie `text-file-path`.
[x] Para `Text file`, registrar un `Gio.FileMonitor` sobre el archivo configurado.
[x] Releer la primera línea y actualizar `thing-value` cuando el archivo cambie.
[x] Limpiar el monitor anterior cuando cambie proveedor, cambie ruta o se deshabilite la extensión.
[x] Evitar bucles innecesarios cuando el proveedor activo sea `Manual`.

### Preferencias

[x] Agregar un grupo o filas de preferencias para seleccionar el proveedor activo.
[x] Mostrar el campo manual existente para el proveedor `Manual`.
[x] Agregar UI para seleccionar o escribir la ruta del archivo de texto para `Text file`.
[x] Deshabilitar u ocultar controles que no apliquen al proveedor activo.
[x] Mantener el campo manual compatible con el binding actual de `thing-value`.
[x] Actualizar la página de preferencias para incluir el nuevo grupo en un orden claro.

### Comportamiento de UI

[x] Confirmar que el panel y el popup sigan reflejando `thing-value` sin reescribir sus bindings actuales.
[x] Confirmar que el icono se muestre cuando el valor sincronizado quede vacío.
[x] Definir el comportamiento del popup cuando `Text file` está activo para evitar que una edición manual parezca persistente si será reemplazada por el archivo.
[x] Ajustar el flujo de foco/entrada del popup si el proveedor activo no permite edición manual.
[x] Implementar que el click sobre el valor visible del panel abra el archivo configurado cuando el proveedor activo sea `Text file`.
[x] Mantener el comportamiento actual de click sobre el valor visible cuando el proveedor activo sea `Manual`.
[x] Manejar el caso en que no haya archivo configurado o no pueda abrirse desde el click del panel.

### i18n

[x] Revisar los textos nuevos de preferencias y usar el patrón de traducción existente donde aplique.
[x] Asegurar que etiquetas como `Manual`, `Text file`, selector de proveedor y selector de archivo sean traducibles si la estructura actual lo permite.

### Manejo de errores

[x] Manejar ruta vacía de `text-file-path` sin lanzar excepción.
[x] Manejar archivo inexistente sin romper la extensión.
[x] Manejar errores de permisos o lectura del archivo.
[x] Manejar archivo vacío devolviendo cadena vacía o manteniendo un comportamiento explícito y documentado.
[x] Registrar errores de forma útil para depuración sin saturar logs cuando el monitor dispare varias veces.
[x] Asegurar que fallos del proveedor no bloqueen `disable` ni dejen monitores activos.

### Calidad de código

[x] Ejecutar `make schemas` o el comando equivalente para validar que el schema compila.
[x] Ejecutar `npm run compile` y corregir errores de empaquetado.
[ ] Run `tsc --noEmit` and fix all type errors
[x] Run `yarn lint` and fix all warnings/errors
[x] Ejecutar `npm run lint` y corregir warnings/errors si `yarn lint` no está disponible en este repo.

## Pasos de Verificación Manual

1. Instalar o recargar la extensión con el schema actualizado.
2. Abrir preferencias y confirmar que el proveedor por defecto sea `Manual`.
3. En `Manual`, escribir un valor y confirmar que se vea en el panel.
4. Cambiar el proveedor a `Text file`.
5. Seleccionar un archivo de texto con varias líneas y confirmar que el panel muestre solo la primera línea no vacía.
6. Editar la primera línea del archivo y guardar; confirmar que el panel se actualice automáticamente sin reiniciar la extensión.
7. Hacer click en el valor visible del panel con `Text file` activo y confirmar que se abra el archivo configurado.
8. Cambiar a un archivo inexistente o borrar el archivo configurado; confirmar que la extensión no se rompa.
9. Hacer click en el valor visible con un archivo inválido y confirmar que se maneje el error sin romper la UI.
10. Cambiar de vuelta a `Manual` y confirmar que el archivo deja de controlar el valor mostrado.
11. Deshabilitar y habilitar la extensión; confirmar que no quedan monitores duplicados y el valor se sincroniza correctamente.
