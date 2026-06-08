import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {SETTINGS_KEYS, TASK_PROVIDERS} from '../../shared/constants.js';

const BindFlags = Gio.SettingsBindFlags.DEFAULT;
const PROVIDER_OPTIONS = Object.freeze([
    {
        label: 'Manual',
        value: TASK_PROVIDERS.manual,
    },
    {
        label: 'Text file',
        value: TASK_PROVIDERS.textFile,
    },
]);

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 */
export function createProviderGroup(settings, gettext) {
    const group = new Adw.PreferencesGroup({
        title: gettext('Task Provider'),
    });
    const providerRow = createProviderRow(settings, gettext);
    const fileRow = createTextFileRow(settings, gettext);
    const syncVisibility = () => {
        fileRow.set_visible(
            settings.get_string(SETTINGS_KEYS.taskProvider) === TASK_PROVIDERS.textFile
        );
    };

    settings.connect(`changed::${SETTINGS_KEYS.taskProvider}`, syncVisibility);
    syncVisibility();

    group.add(providerRow);
    group.add(fileRow);

    return group;
}

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 * @returns {object} Provider selector row
 */
function createProviderRow(settings, gettext) {
    const model = new Gtk.StringList();

    for (const provider of PROVIDER_OPTIONS)
        model.append(gettext(provider.label));

    const row = new Adw.ComboRow({
        title: gettext('Provider'),
        model,
    });

    row.set_selected(getProviderIndex(settings));
    row.connect('notify::selected', () => {
        const provider = PROVIDER_OPTIONS[row.get_selected()] ?? PROVIDER_OPTIONS[0];

        settings.set_string(SETTINGS_KEYS.taskProvider, provider.value);
    });
    settings.connect(`changed::${SETTINGS_KEYS.taskProvider}`, () => {
        const selected = getProviderIndex(settings);

        if (row.get_selected() !== selected)
            row.set_selected(selected);
    });

    return row;
}

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 * @returns {object} Text file path row
 */
function createTextFileRow(settings, gettext) {
    const row = new Adw.EntryRow({
        title: gettext('Text file'),
    });
    const chooseButton = new Gtk.Button({
        icon_name: 'document-open-symbolic',
        tooltip_text: gettext('Choose text file'),
        valign: Gtk.Align.CENTER,
    });

    chooseButton.connect('clicked', () => {
        openTextFileDialog(row, settings, gettext);
    });

    row.add_suffix(chooseButton);
    settings.bind(SETTINGS_KEYS.textFilePath, row, 'text', BindFlags);

    return row;
}

/**
 * @param {object} parentWidget - Widget used to find the parent window
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 */
function openTextFileDialog(parentWidget, settings, gettext) {
    const dialog = new Gtk.FileDialog({
        title: gettext('Choose text file'),
    });

    dialog.open(parentWidget.get_root(), null, (_dialog, result) => {
        try {
            const file = dialog.open_finish(result);
            const path = file.get_path();

            if (path)
                settings.set_string(SETTINGS_KEYS.textFilePath, path);
        } catch (_error) {
        }
    });
}

/**
 * @param {object} settings - Extension settings
 * @returns {number} Provider index
 */
function getProviderIndex(settings) {
    const providerName = settings.get_string(SETTINGS_KEYS.taskProvider);
    const index = PROVIDER_OPTIONS.findIndex(provider => provider.value === providerName);

    if (index === -1)
        return 0;

    return index;
}
