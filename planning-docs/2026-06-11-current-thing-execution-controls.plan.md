# Plan: Controles de ejecución del current thing

## Objetivo

Permitir que el usuario controle la ejecución del `current thing` desde la UI para proveedores no manuales, comenzando por el proveedor `Text file`.

La funcionalidad debe permitir iniciar, pausar, detener/completar, descartar y visualizar el estado y tiempo transcurrido de la tarea activa.

## Contexto y Reglas

- La funcionalidad aplica únicamente a providers que no sean manuales.
- La primera implementación será para el provider `Text file`.
- Los providers no manuales deben incluir los contratos `startCurrentThing()`, `pauseCurrentThing()` y `stopCurrentThing()`.
- La UI debe consumir contratos del provider o manager sin acoplarse directamente a detalles internos de `TextFileTaskProvider`.
- El nuevo menú de ejecución debe ser el primer bloque del popover del provider.
- El bloque de ejecución debe contener `Play`, `Pause`, `Stop` y `Discard` en una sola fila horizontal del popover.
- `Play` guarda el tiempo de inicio y comienza o reanuda el conteo.
- `Pause` pausa el conteo y conserva el tiempo acumulado.
- `Stop` completa la tarea: pide confirmación, calcula tiempo total, mueve la línea activa al final del archivo y agrega el sufijo `: (done) <tiempo>`.
- `Discard` cancela toda la ejecución, vuelve a `Idle`, borra el tiempo acumulado y no modifica el archivo de texto.
- `Discard` debe pedir confirmación antes de cancelar.
- El estado de ejecución debe distinguir `Idle`, `Running`, `Paused` y `Stopped`.
- Una sola ejecución puede estar activa a la vez.
- La ejecución queda asociada al `current thing value` existente al hacer `Play`.
- Si el archivo cambia mientras hay una tarea `Running` o `Paused`, no se debe adoptar automáticamente un nuevo `current thing`.
- Si el archivo cambia durante la ejecución, el manager debe bloquear la sincronización normal y conservar el valor activo hasta `Stop` o `Discard`.
- El conteo de tiempo debe mantenerse aunque el usuario abra o cierre el popover.
- No se requiere persistir el tiempo si la extensión se deshabilita, GNOME Shell se reinicia o el proceso se recarga.
- El tiempo visible debe actualizarse automáticamente cada 1 minuto mientras está `Running`.
- El tiempo visible debe mostrarse en minutos u horas según corresponda, por ejemplo `12 min` o `1h 20min`.
- Debe mostrarse un indicador visual de tarea activa junto al tiempo en el `thing value` visible del panel, no dentro del menú.
- El estado `Paused` debe mostrarse como punto gris junto al tiempo, sin texto `Paused`.
- El plan se basa en la arquitectura actual: providers en `src/extension/taskProviders.js`, manager en `src/extension/taskProviderManager.js`, UI del popover en `src/ui/widget.js`, constantes en `src/shared/constants.js`.

## Tareas

### Modelo de ejecución

[x] Definir constantes internas para estados de ejecución: `idle`, `running`, `paused`, `stopped`.
[x] Definir una estructura de estado de ejecución en el runtime que incluya provider, valor activo, estado, inicio actual, tiempo acumulado y tiempo total.
[x] Asegurar que el estado viva fuera del popover para sobrevivir abrir/cerrar el menú.
[x] Asegurar que solo exista una ejecución activa a la vez.
[x] Definir helpers para calcular tiempo acumulado, tiempo visible y formato `min` / `h min`.

### Contratos de provider

[x] Extender el contrato esperado de providers no manuales con `startCurrentThing()`, `pauseCurrentThing()` y `stopCurrentThing()`.
[x] Mantener `ManualTaskProvider` sin controles de ejecución visibles.
[x] Implementar stubs o manejo explícito para providers que no soporten ejecución.
[x] Decidir si `Discard` vive como contrato de provider o como acción del manager sin modificar archivo.
[x] Documentar con JSDoc los contratos nuevos y los valores esperados.

### Runtime y manager

[x] Agregar métodos públicos en `TaskProviderManager` para iniciar, pausar, detener y descartar la tarea actual.
[x] Hacer que `startCurrentThing()` guarde el `current thing value` activo y el timestamp de inicio.
[x] Hacer que `pauseCurrentThing()` acumule el tiempo transcurrido y deje el estado en `Paused`.
[x] Hacer que un nuevo `Play` desde `Paused` continúe desde el acumulado anterior.
[x] Hacer que `stopCurrentThing()` confirme estado válido, calcule tiempo total y delegue la finalización al provider.
[x] Hacer que `discardCurrentThing()` limpie estado de ejecución sin tocar el archivo.
[x] Bloquear sincronización automática de `thing-value` desde archivo mientras el estado sea `Running` o `Paused`.
[x] Al hacer `Stop` o `Discard`, reactivar sincronización normal del provider.
[x] Emitir o exponer datos de estado suficientes para que la UI refresque controles, indicador y tiempo.
[x] Limpiar timers y señales al destruir el manager.

### Text File Provider

[x] Implementar `TextFileTaskProvider.startCurrentThing()` para validar archivo configurado y línea activa.
[x] Implementar `TextFileTaskProvider.pauseCurrentThing()` si el provider necesita validar estado o dejarlo como operación gestionada por manager.
[x] Implementar `TextFileTaskProvider.stopCurrentThing(activeValue, elapsedLabel)` para completar la tarea en archivo.
[x] Leer el archivo conservando orden de líneas no vacías relevante para la tarea.
[x] Al completar, remover la primera línea activa y agregar al final `<valor> : (done) <tiempo>`.
[x] Preservar líneas restantes en orden.
[x] Definir comportamiento ante archivo vacío, ruta vacía, archivo inexistente o permisos insuficientes.
[x] Evitar modificar el archivo si la línea activa ya no coincide con la primera línea esperada.
[x] Reportar error claro cuando `Stop` no pueda completarse por cambio externo del archivo.
[x] Confirmar que `Discard` no invoque escritura sobre el archivo.

### UI del popover

[x] Agregar un bloque de ejecución como primer bloque del popover del provider `Text file`.
[x] Mostrar los controles de ejecución en una sola fila horizontal.
[x] Agregar acciones `Play`, `Pause`, `Stop` y `Discard` con etiquetas traducibles.
[x] Conectar cada acción de UI con métodos del manager, no con detalles del provider concreto.
[x] Mostrar `Play` habilitado en `Idle` y `Paused`; deshabilitarlo en `Running`.
[x] Mostrar `Pause` habilitado solo en `Running`.
[x] Mostrar `Stop` habilitado en `Running` y `Paused`.
[x] Mostrar `Discard` habilitado en `Running` y `Paused`.
[x] Mostrar confirmación antes de ejecutar `Stop`.
[x] Mostrar confirmación antes de ejecutar `Discard`.
[x] Mostrar indicador visual de ejecución activa junto al tiempo transcurrido en el panel.
[x] Usar punto o texto equivalente para estado `Running` dentro del `thing value`.
[x] Refrescar tiempo visible en el panel cada 1 minuto mientras el estado sea `Running`.
[x] Mantener indicador y tiempo actualizados al abrir el popover.
[x] Mantener el bloque actual de `Open text file`, `Next Things` y `Settings` debajo del nuevo bloque de ejecución.
[x] Confirmar que provider manual no muestre el bloque de ejecución.

### Cambios externos del archivo

[x] Detectar cambios del archivo mientras una tarea está `Running` o `Paused`.
[x] Bloquear actualización automática del `current thing value` durante ejecución activa.
[x] Exponer estado de conflicto si el archivo cambia y la primera línea ya no coincide con la tarea activa.
[x] Deshabilitar o hacer fallar `Stop` con mensaje claro si completar ya no es seguro.
[x] Permitir `Discard` aunque exista conflicto, sin modificar el archivo.
[x] Al resolver con `Discard`, volver a sincronizar desde el archivo actual.

### Manejo de errores

[x] Manejar intento de `Play` sin provider compatible.
[x] Manejar intento de `Play` con archivo no configurado.
[x] Manejar intento de `Play` con archivo vacío.
[x] Manejar intento de `Stop` cuando no hay ejecución activa.
[x] Manejar errores de lectura y escritura del archivo sin romper GNOME Shell.
[x] Manejar errores de permisos con mensaje útil para logs o UI.
[x] Evitar timers duplicados al presionar acciones repetidamente.
[x] Evitar que errores de provider dejen estado inconsistente.
[x] Asegurar que `disable`/`destroy` limpie estado, timer y monitores.

### i18n

[x] Marcar como traducibles los textos nuevos: `Play`, `Pause`, `Stop`, `Discard`, estado de ejecución, tiempo y confirmación.
[x] Revisar si los textos existentes del popover de `Text file` deben migrarse al patrón de traducción usado por el repo.
[x] Verificar que los formatos de tiempo sean comprensibles y consistentes con textos existentes.

### Calidad de código

[x] Agregar o actualizar pruebas/manual checks internos si el repo tiene patrón existente para lógica pura.
[ ] Run `tsc --noEmit` and fix all type errors.
[ ] Run `yarn lint` and fix all warnings/errors.
[x] Ejecutar `npm run lint` si `yarn lint` no está disponible en este repo.
[x] Ejecutar comando de build/compile del proyecto si existe y corregir errores.

## Pasos de Verificación Manual

1. Configurar provider `Text file` con un archivo que contenga `Task A`, `Task B`, `Task C`.
2. Abrir el popover y confirmar que el primer bloque muestra `Play`, `Pause`, `Stop` y `Discard`.
3. Presionar `Play` y confirmar que aparece indicador verde con tiempo transcurrido.
4. Esperar al menos 1 minuto y confirmar que el tiempo cambia automáticamente.
5. Presionar `Pause` y confirmar que el tiempo deja de avanzar.
6. Presionar `Play` otra vez y confirmar que el tiempo continúa desde el acumulado.
7. Presionar `Discard` y confirmar que vuelve a `Idle`, desaparece el tiempo activo y el archivo no cambia.
8. Iniciar otra ejecución, presionar `Stop`, cancelar confirmación y confirmar que nada cambia.
9. Presionar `Stop`, confirmar, y verificar que el archivo cambia de:

   ```text
   Task A
   Task B
   Task C
   ```

   a:

   ```text
   Task B
   Task C
   Task A : (done) <tiempo>
   ```

10. Iniciar ejecución y cerrar el popover; abrirlo luego y confirmar que estado y tiempo siguen visibles.
11. Iniciar ejecución y editar externamente la primera línea del archivo; confirmar que el `current thing` activo no cambia automáticamente.
12. Con conflicto por cambio externo, confirmar que `Discard` cancela ejecución y no modifica el archivo.
13. Cambiar a provider `Manual` y confirmar que los controles de ejecución no aparecen.
14. Probar archivo vacío, ruta vacía y archivo sin permisos; confirmar que la extensión no se rompe.
