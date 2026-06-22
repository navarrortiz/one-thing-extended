import {SETTINGS_KEYS, THING_PROVIDERS} from '../shared/constants.js';
import ManualThingProvider from './thingProviders/manual.js';
import TextFileThingProvider from './thingProviders/textFile.js';
export {
    getConfiguredTextFile,
    getConfiguredTextFilePath,
    getConfiguredTextFilePaths,
    getTextFileEntries,
    setConfiguredTextFilePath,
    setConfiguredTextFilePaths
} from './thingProviders/textFileUtils.js';

const PROVIDER_FACTORIES = Object.freeze({
    [THING_PROVIDERS.manual]: settings => new ManualThingProvider(settings),
    [THING_PROVIDERS.textFile]: settings => new TextFileThingProvider(settings),
});

/**
 * Returns the configured provider name, falling back to manual for unknown values.
 *
 * @param {object} settings - Extension settings
 * @returns {string} Provider name
 */
export function getActiveThingProviderName(settings) {
    const providerName = settings.get_string(SETTINGS_KEYS.thingProvider);

    if (Object.hasOwn(PROVIDER_FACTORIES, providerName))
        return providerName;

    return THING_PROVIDERS.manual;
}

/**
 * Checks whether the active provider is the text file provider.
 *
 * @param {object} settings - Extension settings
 * @returns {boolean} True when the text file provider is active
 */
export function isTextFileThingProvider(settings) {
    return getActiveThingProviderName(settings) === THING_PROVIDERS.textFile;
}

/**
 * Creates the active thing provider.
 *
 * @param {object} settings - Extension settings
 * @returns {ManualThingProvider|TextFileThingProvider} Thing provider instance
 */
export function createThingProvider(settings) {
    const providerName = getActiveThingProviderName(settings);

    return PROVIDER_FACTORIES[providerName](settings);
}
