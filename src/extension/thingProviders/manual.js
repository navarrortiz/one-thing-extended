import {SETTINGS_KEYS} from '../../shared/constants.js';

export default class ManualThingProvider {
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
