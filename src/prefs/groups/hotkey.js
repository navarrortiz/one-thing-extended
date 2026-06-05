import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import ShortcutRow from '../shortcutRow.js';
import {SETTINGS_KEYS} from '../../shared/constants.js';

const BindFlags = Gio.SettingsBindFlags.DEFAULT;

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 */
export function createHotKeyGroup(settings, gettext) {
    const group = new Adw.PreferencesGroup({
        title: 'Hot Key',
    });

    const switchRow = new Adw.SwitchRow({
        title: 'Allow HotKey (Super+W by default)',
    });

    settings.bind(SETTINGS_KEYS.hotKeyEnabled, switchRow, 'active', BindFlags);
    group.add(switchRow);
    group.add(new ShortcutRow(settings, gettext));

    return group;
}
