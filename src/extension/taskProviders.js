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

    /**
     * Gets upcoming things for manual provider.
     *
     * @param {number} _limit - Maximum number of items
     * @param {number} _maxLineLength - Maximum length per item
     * @returns {string[]} Empty list for manual provider
     */
    getNextThings(_limit, _maxLineLength) {
        return [];
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
     * @returns {Promise<string>} Current thing
     */
    async getCurrentThing() {
        const file = getConfiguredTextFile(this._settings);

        if (!file)
            return '';

        const lines = await getNonEmptyLines(file);
        const line = lines[0];

        return line?.trim() ?? '';
    }

    /**
     * Gets the upcoming things from the configured text file.
     *
     * @param {number} [limit=5] - Maximum number of upcoming lines
     * @param {number} [maxLineLength=90] - Maximum length per line
     * @returns {Promise<string[]>} Upcoming non-empty lines excluding the current thing
     */
    async getNextThings(limit = 5, maxLineLength = 90) {
        const file = getConfiguredTextFile(this._settings);

        if (!file)
            return [];

        const lines = await getNonEmptyLines(file);

        return lines
            .slice(1, limit + 1)
            .map(value => truncateLine(value, maxLineLength));
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

/**
 * Reads and returns non-empty trimmed lines from a file.
 *
 * @param {Gio.File} file - Source file
 * @returns {Promise<string[]>} Non-empty trimmed lines
 */
async function getNonEmptyLines(file) {
    const contents = await readFileContents(file);
    const text = new TextDecoder('utf-8').decode(contents);

    return text
        .split(/\r?\n/)
        .map(value => value.trim())
        .filter(value => value !== '');
}

/**
 * Reads file contents asynchronously.
 *
 * @param {Gio.File} file - Source file
 * @returns {Promise<Uint8Array>} File contents bytes
 */
function readFileContents(file) {
    return new Promise((resolve, reject) => {
        file.load_contents_async(null, (source, result) => {
            try {
                const [, contents] = source.load_contents_finish(result);
                resolve(contents);
            } catch (error) {
                reject(error);
            }
        });
    });
}

/**
 * Truncates a line to a fixed display length.
 *
 * @param {string} value - Raw line value
 * @param {number} maxLength - Maximum displayed length
 * @returns {string} Truncated or original line
 */
function truncateLine(value, maxLength) {
    if (value.length <= maxLength)
        return value;

    return `${value.slice(0, maxLength - 1)}…`;
}
