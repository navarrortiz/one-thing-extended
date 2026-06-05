import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {SETTINGS_KEYS} from '../../shared/constants.js';

const BindFlags = Gio.SettingsBindFlags.DEFAULT;

/**
 * @param {object} settings - Extension settings
 */
export function createTextGroup(settings) {
    const group = new Adw.PreferencesGroup();
    const entryRow = new Adw.EntryRow({
        title: 'Enter your one thing here',
        'enable-emoji-completion': true,
        'activates-default': true,
    });

    settings.bind(SETTINGS_KEYS.thingValue, entryRow, 'text', BindFlags);

    group.add(entryRow);
    return group;
}
