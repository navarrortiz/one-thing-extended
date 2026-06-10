import Gio from 'gi://Gio';
import St from 'gi://St';

import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {SETTINGS_KEYS} from '../shared/constants.js';
import {addChild} from './compat.js';
import {addContextMenu} from './entryMenu.js';

/**
 * @param {object} settings - Extension settings
 * @param {Function} onPreferencesOpen - Callback when preferences icon is clicked
 */
export function createPopupEntry(settings, onPreferencesOpen) {
    const inputText = new St.Entry({
        hint_text: 'Write One Thing',
        text: settings.get_string(SETTINGS_KEYS.thingValue),
        track_hover: true,
        can_focus: true,
        style_class: 'one-thing-input',
        secondary_icon: new St.Icon({
            icon_name: 'preferences-system-symbolic',
            icon_size: 16,
        }),
    });

    inputText.connect('secondary-icon-clicked', onPreferencesOpen);

    settings.bind(
        SETTINGS_KEYS.showSettingsButton,
        inputText.secondary_icon,
        'visible',
        Gio.SettingsBindFlags.DEFAULT
    );

    addContextMenu(inputText, undefined, onPreferencesOpen);

    const menuItem = new PopupMenu.PopupBaseMenuItem({
        reactive: false,
    });
    addChild(menuItem, inputText);

    return {
        inputText,
        menuItem,
    };
}
