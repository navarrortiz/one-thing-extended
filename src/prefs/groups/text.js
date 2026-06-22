import Adw from 'gi://Adw';
import Gio from 'gi://Gio';

import {SETTINGS_KEYS, THING_PROVIDERS} from '../../shared/constants.js';

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
    settings.connect(`changed::${SETTINGS_KEYS.thingProvider}`, () => {
        syncManualGroupVisibility(group, settings);
    });
    syncManualGroupVisibility(group, settings);

    group.add(entryRow);
    return group;
}

/**
 * @param {object} group - Manual text group
 * @param {object} settings - Extension settings
 */
function syncManualGroupVisibility(group, settings) {
    group.set_visible(
        settings.get_string(SETTINGS_KEYS.thingProvider) === THING_PROVIDERS.manual
    );
}
