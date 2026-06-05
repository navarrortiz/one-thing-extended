import Adw from 'gi://Adw';

import {createGeneralGroup} from './groups/general.js';
import {createHotKeyGroup} from './groups/hotkey.js';
import {createLocationGroup} from './groups/location.js';
import {createTextGroup} from './groups/text.js';

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 */
export function buildPreferencesPage(settings, gettext) {
    const page = new Adw.PreferencesPage();

    page.add(createTextGroup(settings));
    page.add(createGeneralGroup(settings));
    page.add(createHotKeyGroup(settings, gettext));
    page.add(createLocationGroup(settings));

    return page;
}
