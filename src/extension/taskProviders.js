import {SETTINGS_KEYS, TASK_PROVIDERS} from '../shared/constants.js';
import ManualTaskProvider from './taskProviders/manual.js';
import TextFileTaskProvider from './taskProviders/textFile.js';
export {getConfiguredTextFile} from './taskProviders/textFileUtils.js';

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
