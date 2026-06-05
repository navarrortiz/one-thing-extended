import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';

import {SETTINGS_KEYS} from '../shared/constants.js';
import {addContextMenu} from './entryMenu.js';

/**
 * @param {object} settings - Extension settings
 */
export function createPanelText(settings) {
    const panelText = new St.Label({
        text: settings.get_string(SETTINGS_KEYS.thingValue),
        track_hover: true,
        can_focus: true,
        y_align: Clutter.ActorAlign.CENTER,
        style_class: 'one-thing-panel-text',
    });

    addContextMenu(panelText);
    settings.bind(
        SETTINGS_KEYS.thingValue,
        panelText,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );

    return panelText;
}
