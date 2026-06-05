import {gettext} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {buildPreferencesPage} from './page.js';

export default class PreferencesController {
    constructor(preferences) {
        this._preferences = preferences;
    }

    fillWindow(window) {
        const settings = this._preferences.getSettings();
        const page = buildPreferencesPage(settings, gettext);

        window.add(page);
    }
}
