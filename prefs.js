import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import PreferencesController from './src/prefs/controller.js';

export default class OneThingGnomeExtensionPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        new PreferencesController(this).fillWindow(window);
    }
}
