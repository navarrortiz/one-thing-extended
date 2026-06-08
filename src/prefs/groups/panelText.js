import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import PangoCairo from 'gi://PangoCairo';

import {SETTINGS_KEYS} from '../../shared/constants.js';

const BindFlags = Gio.SettingsBindFlags.DEFAULT;

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 */
export function createPanelTextGroup(settings, gettext) {
    const group = new Adw.PreferencesGroup({
        title: gettext('Panel Text'),
    });
    const fontFamilyRow = createFontFamilyRow(settings, gettext);
    const fontSizeRow = new Adw.SpinRow({
        title: gettext('Font size'),
        subtitle: gettext('Set 0 to use the default size'),
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 96,
            value: 0,
            'page-increment': 2,
            'step-increment': 1,
        }),
    });
    const fontColorRow = createFontColorRow(settings, gettext);

    settings.bind(SETTINGS_KEYS.panelFontSize, fontSizeRow, 'value', BindFlags);

    group.add(fontFamilyRow);
    group.add(fontSizeRow);
    group.add(fontColorRow);

    return group;
}

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 * @returns {object} Font family selector row
 */
function createFontFamilyRow(settings, gettext) {
    const options = getFontFamilyOptions(gettext);
    const model = new Gtk.StringList();

    for (const option of options)
        model.append(option.label);

    const row = new Adw.ComboRow({
        title: gettext('Font family'),
        model,
    });

    row.set_selected(getSelectedFontFamilyIndex(settings, options));
    row.connect('notify::selected', () => {
        const option = options[row.get_selected()] ?? options[0];

        settings.set_string(SETTINGS_KEYS.panelFontFamily, option.value);
    });
    settings.connect(`changed::${SETTINGS_KEYS.panelFontFamily}`, () => {
        const selected = getSelectedFontFamilyIndex(settings, options);

        if (row.get_selected() !== selected)
            row.set_selected(selected);
    });

    return row;
}

/**
 * @param {Function} gettext - Gettext translation function
 * @returns {Array<object>} Font family selector options
 */
function getFontFamilyOptions(gettext) {
    const fontMap = PangoCairo.FontMap.get_default();
    const familyNames = fontMap
        .list_families()
        .map(family => family.get_name())
        .sort((left, right) => left.localeCompare(right));

    return [
        {
            label: gettext('Default'),
            value: '',
        },
        ...familyNames.map(familyName => {
            return {
                label: familyName,
                value: familyName,
            };
        }),
    ];
}

/**
 * @param {object} settings - Extension settings
 * @param {Array<object>} options - Font family selector options
 * @returns {number} Selected option index
 */
function getSelectedFontFamilyIndex(settings, options) {
    const fontFamily = settings.get_string(SETTINGS_KEYS.panelFontFamily);
    const index = options.findIndex(option => option.value === fontFamily);

    if (index === -1)
        return 0;

    return index;
}

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 * @returns {object} Font color row
 */
function createFontColorRow(settings, gettext) {
    const row = new Adw.ActionRow({
        title: gettext('Font color'),
        subtitle: gettext('Reset to use the default theme color'),
    });
    const colorButton = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({
            title: gettext('Choose font color'),
        }),
        valign: Gtk.Align.CENTER,
    });
    const resetButton = new Gtk.Button({
        icon_name: 'edit-clear-symbolic',
        tooltip_text: gettext('Use default color'),
        valign: Gtk.Align.CENTER,
    });
    let updatingColorButton = false;
    const sync = () => {
        updatingColorButton = true;
        syncColorButton(settings, colorButton);
        updatingColorButton = false;
    };

    sync();
    colorButton.connect('notify::rgba', () => {
        if (updatingColorButton)
            return;

        settings.set_string(
            SETTINGS_KEYS.panelFontColor,
            colorButton.get_rgba().to_string()
        );
    });
    resetButton.connect('clicked', () => {
        settings.set_string(SETTINGS_KEYS.panelFontColor, '');
    });
    settings.connect(`changed::${SETTINGS_KEYS.panelFontColor}`, () => {
        sync();
    });

    row.add_suffix(colorButton);
    row.add_suffix(resetButton);
    row.activatable_widget = colorButton;

    return row;
}

/**
 * @param {object} settings - Extension settings
 * @param {object} colorButton - Color picker button
 */
function syncColorButton(settings, colorButton) {
    colorButton.set_rgba(getConfiguredColor(settings));
}

/**
 * @param {object} settings - Extension settings
 * @returns {Gdk.RGBA} Configured color
 */
function getConfiguredColor(settings) {
    const color = settings.get_string(SETTINGS_KEYS.panelFontColor);
    const rgba = new Gdk.RGBA();

    if (color !== '' && rgba.parse(color))
        return rgba;

    rgba.parse('rgb(255,255,255)');
    return rgba;
}
