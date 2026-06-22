import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {SETTINGS_KEYS, THING_PROVIDERS} from '../../shared/constants.js';
import {
    getConfiguredTextFilePaths,
    getTextFileEntries,
    setConfiguredTextFilePath,
    setConfiguredTextFilePaths
} from '../../extension/thingProviders/textFileUtils.js';

const BindFlags = Gio.SettingsBindFlags.DEFAULT;
const PROVIDER_OPTIONS = Object.freeze([
    {
        label: 'Manual',
        value: THING_PROVIDERS.manual,
    },
    {
        label: 'Text file',
        value: THING_PROVIDERS.textFile,
    },
]);

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 */
export function createProviderGroup(settings, gettext) {
    const group = new Adw.PreferencesGroup({
        title: gettext('Thing Provider'),
    });
    const providerRow = createProviderRow(settings, gettext);
    const addFileRow = createAddTextFileRow(settings, gettext, () => {
        refreshTextFileRows();
    });
    const previewLimitRow = createTextFilePreviewLimitRow(settings, gettext);
    let fileRows = [];

    const syncVisibility = () => {
        const isTextFileProvider =
            settings.get_string(SETTINGS_KEYS.thingProvider) === THING_PROVIDERS.textFile;

        addFileRow.set_visible(isTextFileProvider);
        previewLimitRow.set_visible(isTextFileProvider);

        for (const row of fileRows)
            row.set_visible(isTextFileProvider);
    };
    const refreshTextFileRows = () => {
        for (const row of fileRows)
            group.remove(row);

        fileRows = getTextFileEntries(settings).map(entry =>
            createTextFilePathRow(settings, gettext, entry, refreshTextFileRows)
        );

        group.remove(previewLimitRow);
        for (const row of fileRows)
            group.add(row);
        group.add(previewLimitRow);
        syncVisibility();
    };

    settings.connect(`changed::${SETTINGS_KEYS.thingProvider}`, syncVisibility);
    settings.connect(`changed::${SETTINGS_KEYS.textFilePaths}`, refreshTextFileRows);
    settings.connect(`changed::${SETTINGS_KEYS.textFileActivePath}`, refreshTextFileRows);

    group.add(providerRow);
    group.add(addFileRow);
    group.add(previewLimitRow);
    refreshTextFileRows();
    syncVisibility();

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

        settings.set_string(SETTINGS_KEYS.thingProvider, provider.value);
    });
    settings.connect(`changed::${SETTINGS_KEYS.thingProvider}`, () => {
        const selected = getProviderIndex(settings);

        if (row.get_selected() !== selected)
            row.set_selected(selected);
    });

    return row;
}

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 * @param {Function} onFilesChanged - Callback after files change
 * @returns {object} Add text-file row
 */
function createAddTextFileRow(settings, gettext, onFilesChanged) {
    const row = new Adw.ActionRow({
        title: gettext('Text files'),
        subtitle: gettext('Add files and choose the active file'),
    });
    const addButton = new Gtk.Button({
        icon_name: 'list-add-symbolic',
        tooltip_text: gettext('Add text files'),
        valign: Gtk.Align.CENTER,
    });

    addButton.connect('clicked', () => {
        openTextFileDialog(row, settings, onFilesChanged, gettext);
    });

    row.add_suffix(addButton);
    row.activatable_widget = addButton;

    return row;
}

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 * @param {{path: string, fileName: string, isActive: boolean}} entry - Text-file entry
 * @param {Function} onFilesChanged - Callback after files change
 * @returns {object} Text-file row
 */
function createTextFilePathRow(settings, gettext, entry, onFilesChanged) {
    const row = new Adw.ActionRow({
        title: entry.fileName,
        subtitle: entry.path,
    });
    const activeButton = new Gtk.CheckButton({
        active: entry.isActive,
        tooltip_text: gettext('Active file'),
        valign: Gtk.Align.CENTER,
    });
    const removeButton = new Gtk.Button({
        icon_name: 'user-trash-symbolic',
        tooltip_text: gettext('Remove text file'),
        valign: Gtk.Align.CENTER,
    });

    activeButton.connect('toggled', () => {
        if (activeButton.active)
            setConfiguredTextFilePath(settings, entry.path);
    });
    removeButton.connect('clicked', () => {
        const nextPaths = getConfiguredTextFilePaths(settings)
            .filter(path => path !== entry.path);

        setConfiguredTextFilePaths(settings, nextPaths);
        onFilesChanged();
    });

    row.add_prefix(activeButton);
    row.add_suffix(removeButton);
    row.activatable_widget = activeButton;

    return row;
}

/**
 * @param {object} settings - Extension settings
 * @param {Function} gettext - Gettext translation function
 * @returns {object} Text file preview limit row
 */
function createTextFilePreviewLimitRow(settings, gettext) {
    const row = new Adw.SpinRow({
        title: gettext('Preview limit'),
        subtitle: gettext('How many upcoming lines to show in the popover'),
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 20,
            value: 5,
            'page-increment': 1,
            'step-increment': 1,
        }),
    });

    settings.bind(SETTINGS_KEYS.textFilePreviewLimit, row, 'value', BindFlags);

    return row;
}

/**
 * @param {object} parentWidget - Widget used to find the parent window
 * @param {object} settings - Extension settings
 * @param {Function} onFilesChanged - Callback after files change
 * @param {Function} gettext - Gettext translation function
 */
function openTextFileDialog(parentWidget, settings, onFilesChanged, gettext) {
    const dialog = new Gtk.FileDialog({
        title: gettext('Choose text files'),
    });

    if (typeof dialog.open_multiple === 'function') {
        dialog.open_multiple(parentWidget.get_root(), null, (_dialog, result) => {
            try {
                const files = dialog.open_multiple_finish(result);
                const paths = [];

                for (let index = 0; index < files.get_n_items(); index++) {
                    const path = files.get_item(index).get_path();

                    if (path)
                        paths.push(path);
                }

                addTextFilePaths(settings, paths);
                onFilesChanged();
            } catch (_error) {
            }
        });
        return;
    }

    dialog.open(parentWidget.get_root(), null, (_dialog, result) => {
        try {
            const file = dialog.open_finish(result);
            const path = file.get_path();

            if (path)
                addTextFilePaths(settings, [path]);

            onFilesChanged();
        } catch (_error) {
        }
    });
}

/**
 * @param {object} settings - Extension settings
 * @param {string[]} paths - Paths to add
 */
function addTextFilePaths(settings, paths) {
    const existingPaths = getConfiguredTextFilePaths(settings);
    const nextPaths = [...existingPaths];

    for (const path of paths) {
        if (!nextPaths.includes(path))
            nextPaths.push(path);
    }

    setConfiguredTextFilePaths(settings, nextPaths);

    if (settings.get_string(SETTINGS_KEYS.textFileActivePath).trim() === '' && nextPaths.length > 0)
        setConfiguredTextFilePath(settings, nextPaths[0]);
}

/**
 * @param {object} settings - Extension settings
 * @returns {number} Provider index
 */
function getProviderIndex(settings) {
    const providerName = settings.get_string(SETTINGS_KEYS.thingProvider);
    const index = PROVIDER_OPTIONS.findIndex(provider => provider.value === providerName);

    if (index === -1)
        return 0;

    return index;
}
