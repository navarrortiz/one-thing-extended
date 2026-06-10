import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';

import {SETTINGS_KEYS} from '../shared/constants.js';

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
