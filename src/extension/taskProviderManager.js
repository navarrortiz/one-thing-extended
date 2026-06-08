import Gio from 'gi://Gio';

import {SETTINGS_KEYS, TASK_PROVIDERS} from '../shared/constants.js';
import {
    createTaskProvider,
    getActiveTaskProviderName,
    getConfiguredTextFile,
    isTextFileTaskProvider
} from './taskProviders.js';

/**
 * Coordinates the active task provider with the existing thing-value setting.
 */
export default class TaskProviderManager {
    /**
     * @param {object} settings - Extension settings
     */
    constructor(settings) {
        this._settings = settings;
        this._monitor = null;
        this._monitorSignalId = null;
        this._lastErrorMessage = null;
    }

    /**
     * Starts provider synchronization.
     */
    enable() {
        this.sync();
    }

    /**
     * Synchronizes the current provider value and related file monitor.
     */
    sync() {
        this._syncTextFileMonitor();
        this._syncCurrentThing();
    }

    /**
     * Opens the configured text file in the default application.
     *
     * @returns {boolean} True when opening was attempted successfully
     */
    openConfiguredTextFile() {
        if (!isTextFileTaskProvider(this._settings))
            return false;

        const file = getConfiguredTextFile(this._settings);

        if (!file || !file.query_exists(null))
            return false;

        try {
            Gio.AppInfo.launch_default_for_uri(
                file.get_uri(),
                globalThis.global?.create_app_launch_context(0, -1) ?? null
            );
            this._clearLastError();
            return true;
        } catch (error) {
            this._logProviderError(error);
            return false;
        }
    }

    /**
     * Stops provider synchronization.
     */
    destroy() {
        this._disconnectTextFileMonitor();
        this._settings = null;
    }

    /**
     * @returns {boolean} True when manual edits should be accepted
     */
    allowsManualEditing() {
        return getActiveTaskProviderName(this._settings) === TASK_PROVIDERS.manual;
    }

    /**
     * @returns {boolean} True when the text file provider is active
     */
    usesTextFileProvider() {
        return isTextFileTaskProvider(this._settings);
    }

    _syncCurrentThing() {
        if (this.allowsManualEditing())
            return;

        try {
            const provider = createTaskProvider(this._settings);
            const thingValue = provider.getCurrentThing();

            this._setThingValue(thingValue);
            this._clearLastError();
        } catch (error) {
            this._logProviderError(error);
        }
    }

    _setThingValue(thingValue) {
        if (thingValue === this._settings.get_string(SETTINGS_KEYS.thingValue))
            return;

        this._settings.set_string(SETTINGS_KEYS.thingValue, thingValue);
    }

    _syncTextFileMonitor() {
        this._disconnectTextFileMonitor();

        if (!isTextFileTaskProvider(this._settings))
            return;

        const file = getConfiguredTextFile(this._settings);

        if (!file)
            return;

        try {
            this._monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            this._monitorSignalId = this._monitor.connect('changed', () => {
                this._syncCurrentThing();
            });
            this._clearLastError();
        } catch (error) {
            this._logProviderError(error);
        }
    }

    _disconnectTextFileMonitor() {
        if (!this._monitor)
            return;

        if (this._monitorSignalId) {
            this._monitor.disconnect(this._monitorSignalId);
            this._monitorSignalId = null;
        }

        this._monitor.cancel();
        this._monitor = null;
    }

    _logProviderError(error) {
        const message = error?.message ?? `${error}`;

        if (message === this._lastErrorMessage)
            return;

        this._lastErrorMessage = message;
        logError(error, 'One Thing task provider error');
    }

    _clearLastError() {
        this._lastErrorMessage = null;
    }
}
