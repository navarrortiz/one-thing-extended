import Gio from 'gi://Gio';

import {SETTINGS_KEYS, TASK_PROVIDERS} from '../shared/constants.js';

const PROVIDER_FACTORIES = Object.freeze({
    [TASK_PROVIDERS.manual]: settings => new ManualTaskProvider(settings),
    [TASK_PROVIDERS.textFile]: settings => new TextFileTaskProvider(settings),
});

/**
 * Returns the configured provider name, falling back to manual for unknown values.
 *
 * @param {object} settings - Extension settings
 * @returns {string} Provider name
 */
export function getActiveTaskProviderName(settings) {
    const providerName = settings.get_string(SETTINGS_KEYS.taskProvider);

    if (Object.hasOwn(PROVIDER_FACTORIES, providerName))
        return providerName;

    return TASK_PROVIDERS.manual;
}

/**
 * Checks whether the active provider is the text file provider.
 *
 * @param {object} settings - Extension settings
 * @returns {boolean} True when the text file provider is active
 */
export function isTextFileTaskProvider(settings) {
    return getActiveTaskProviderName(settings) === TASK_PROVIDERS.textFile;
}

/**
 * Creates the active task provider.
 *
 * @param {object} settings - Extension settings
 * @returns {ManualTaskProvider|TextFileTaskProvider} Task provider instance
 */
export function createTaskProvider(settings) {
    const providerName = getActiveTaskProviderName(settings);

    return PROVIDER_FACTORIES[providerName](settings);
}

class ManualTaskProvider {
    /**
     * @param {object} settings - Extension settings
     */
    constructor(settings) {
        this._settings = settings;
    }

    /**
     * Gets the current manually configured thing.
     *
     * @returns {string} Current thing
     */
    getCurrentThing() {
        return this._settings.get_string(SETTINGS_KEYS.thingValue);
    }
}

class TextFileTaskProvider {
    /**
     * @param {object} settings - Extension settings
     */
    constructor(settings) {
        this._settings = settings;
    }

    /**
     * Gets the current thing from the first non-empty line of the configured text file.
     *
     * @returns {string} Current thing
     */
    getCurrentThing() {
        const file = getConfiguredTextFile(this._settings);

        if (!file)
            return '';

        const [, contents] = file.load_contents(null);
        const text = new TextDecoder('utf-8').decode(contents);

        const line = text
            .split(/\r?\n/)
            .find(value => value.trim() !== '');

        return line?.trim() ?? '';
    }
}

/**
 * Gets the configured text file.
 *
 * @param {object} settings - Extension settings
 * @returns {Gio.File|null} Configured file or null
 */
export function getConfiguredTextFile(settings) {
    const path = settings.get_string(SETTINGS_KEYS.textFilePath).trim();

    if (path === '')
        return null;

    return Gio.File.new_for_path(path);
}
