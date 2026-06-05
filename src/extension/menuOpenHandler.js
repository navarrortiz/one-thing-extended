import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

/**
 * @param {object} injectionManager - The injection manager instance
 * @param {Function} onMenuOpen - Callback invoked when the menu opens
 */
export function installMenuOpenHandler(injectionManager, onMenuOpen) {
    injectionManager.overrideMethod(
        PanelMenu.Button.prototype,
        '_onOpenStateChanged',
        originalMethod => {
            return function (...args) {
                // eslint-disable-next-line no-invalid-this
                originalMethod.call(this, ...args);
                onMenuOpen();
            };
        }
    );
}
