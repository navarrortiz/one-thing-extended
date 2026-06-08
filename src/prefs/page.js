import Adw from 'gi://Adw';

import {createGeneralGroup} from './groups/general.js';
import {createHotKeyGroup} from './groups/hotkey.js';
import {createLocationGroup} from './groups/location.js';
import {createPanelTextGroup} from './groups/panelText.js';
import {createProviderGroup} from './groups/provider.js';
import {createTextGroup} from './groups/text.js';

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 */
export function buildPreferencesPage(settings, gettext) {
    const page = new Adw.PreferencesPage();

    page.add(createProviderGroup(settings, gettext));
    page.add(createTextGroup(settings));
    page.add(createPanelTextGroup(settings, gettext));
    page.add(createGeneralGroup(settings));
    page.add(createHotKeyGroup(settings, gettext));
    page.add(createLocationGroup(settings));

    return page;
}
