import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {BoxPointer} from 'resource:///org/gnome/shell/ui/boxpointer.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {SETTINGS_KEYS} from '../shared/constants.js';
import {addChild} from './compat.js';

/**
 * @param {object} settings - Extension settings
 * @param {object} actions - Panel text context actions
 */
export function createPanelText(settings, actions) {
    const panelText = new St.Label({
        text: settings.get_string(SETTINGS_KEYS.thingValue),
        track_hover: true,
        can_focus: true,
        y_align: Clutter.ActorAlign.CENTER,
        style_class: 'one-thing-panel-text',
    });

    addPanelTextContextMenu(panelText, actions);
    bindPanelTextStyle(settings, panelText);

    settings.bind(
        SETTINGS_KEYS.thingValue,
        panelText,
        'text',
        Gio.SettingsBindFlags.DEFAULT
    );

    return panelText;
}

/**
 * @param {object} panelText - Panel text label
 * @param {object} actions - Panel text context actions
 */
function addPanelTextContextMenu(panelText, actions) {
    const menu = new PopupMenu.PopupMenu(panelText, 0, St.Side.TOP);
    const menuManager = new PopupMenu.PopupMenuManager(panelText);
    const openFileItem = new PopupMenu.PopupMenuItem(_('Open file'));
    const separator = new PopupMenu.PopupSeparatorMenuItem();
    const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));

    menuManager.addMenu(menu);
    menu.addMenuItem(openFileItem);
    menu.addMenuItem(separator);
    menu.addMenuItem(settingsItem);
    addChild(Main.uiGroup, menu.actor);
    menu.actor.hide();

    openFileItem.connect('activate', () => {
        menu.close();
        actions.onOpenFile();
    });
    settingsItem.connect('activate', () => {
        menu.close();
        actions.onOpenSettings();
    });
    panelText.connect('button-press-event', (_actor, event) => {
        if (event.get_button() !== 3)
            return Clutter.EVENT_PROPAGATE;

        syncContextMenuVisibility(openFileItem, separator, actions);
        menu.open(BoxPointer.PopupAnimation.FULL);
        return Clutter.EVENT_STOP;
    });
    panelText.connect('popup-menu', () => {
        syncContextMenuVisibility(openFileItem, separator, actions);
        menu.open(BoxPointer.PopupAnimation.FULL);
        return Clutter.EVENT_STOP;
    });
    panelText.connect('destroy', () => {
        menu.destroy();
    });
}

/**
 * @param {object} openFileItem - Open file menu item
 * @param {object} separator - Separator menu item
 * @param {object} actions - Panel text context actions
 */
function syncContextMenuVisibility(openFileItem, separator, actions) {
    const canOpenFile = actions.canOpenFile();

    openFileItem.actor.visible = canOpenFile;
    separator.actor.visible = canOpenFile;
}

/**
 * @param {object} settings - Extension settings
 * @param {object} panelText - Panel text label
 */
function bindPanelTextStyle(settings, panelText) {
    const signalIds = [
        settings.connect(`changed::${SETTINGS_KEYS.panelFontFamily}`, () => {
            syncPanelTextStyle(settings, panelText);
        }),
        settings.connect(`changed::${SETTINGS_KEYS.panelFontSize}`, () => {
            syncPanelTextStyle(settings, panelText);
        }),
        settings.connect(`changed::${SETTINGS_KEYS.panelFontColor}`, () => {
            syncPanelTextStyle(settings, panelText);
        }),
    ];

    panelText.connect('destroy', () => {
        for (const signalId of signalIds)
            settings.disconnect(signalId);
    });

    syncPanelTextStyle(settings, panelText);
}

/**
 * @param {object} settings - Extension settings
 * @param {object} panelText - Panel text label
 */
function syncPanelTextStyle(settings, panelText) {
    const fontFamily = settings
        .get_string(SETTINGS_KEYS.panelFontFamily)
        .replace(/[\r\n]/g, ' ')
        .trim();
    const fontSize = settings.get_int(SETTINGS_KEYS.panelFontSize);
    const fontColor = settings
        .get_string(SETTINGS_KEYS.panelFontColor)
        .trim();
    const styleRules = [];

    if (fontFamily !== '')
        styleRules.push(`font-family: "${escapeCssString(fontFamily)}";`);

    if (fontSize > 0)
        styleRules.push(`font-size: ${fontSize}px;`);

    if (isSupportedCssColor(fontColor))
        styleRules.push(`color: ${fontColor};`);

    panelText.set_style(styleRules.join(' '));
}

/**
 * @param {string} value - CSS string value
 * @returns {string} Escaped CSS string value
 */
function escapeCssString(value) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
}

/**
 * @param {string} value - CSS color value
 * @returns {boolean} True when the color value is supported
 */
function isSupportedCssColor(value) {
    return /^(#[0-9a-fA-F]{3,8}|rgba?\([\d.,\s%]+\))$/.test(value);
}
