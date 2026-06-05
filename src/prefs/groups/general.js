import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {SETTINGS_KEYS} from '../../shared/constants.js';

const BindFlags = Gio.SettingsBindFlags.DEFAULT;

/**
 * @param {object} settings - Extension settings
 */
export function createGeneralGroup(settings) {
    const group = new Adw.PreferencesGroup({
        title: 'Preferences',
    });

    const switchRow = new Adw.SwitchRow({
        title: 'Show Preferences Button Next to Entry',
        subtitle: 'You can always access it in Extensions',
    });

    settings.bind(SETTINGS_KEYS.showSettingsButton, switchRow, 'active', BindFlags);
    group.add(switchRow);

    return group;
}
