import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {SETTINGS_KEYS} from '../shared/constants.js';

const KEYBINDING_NAME = 'activate-one-thing-extended';

/**
 * @param {object} settings - Extension settings
 * @param {Function} handler - Keybinding activation handler
 */
export function syncKeybinding(settings, handler) {
    Main.wm.removeKeybinding(KEYBINDING_NAME);

    if (!settings.get_boolean(SETTINGS_KEYS.hotKeyEnabled))
        return;

    Main.wm.addKeybinding(
        KEYBINDING_NAME,
        settings,
        Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
        Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW,
        handler
    );
}

/**
 * Removes the extension keybinding.
 */
export function removeKeybinding() {
    Main.wm.removeKeybinding(KEYBINDING_NAME);
}
