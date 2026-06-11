import Gio from 'gi://Gio';

import {SETTINGS_KEYS, TASK_EXECUTION_STATES, TASK_PROVIDERS} from '../shared/constants.js';
import {
    createTaskProvider,
    getActiveTaskProviderName,
    getConfiguredTextFile,
    isTextFileTaskProvider
} from './taskProviders.js';

const ACTIVE_EXECUTION_STATES = new Set([
    TASK_EXECUTION_STATES.running,
    TASK_EXECUTION_STATES.paused,
]);
const VALID_EXECUTION_STATES = new Set(Object.values(TASK_EXECUTION_STATES));

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
        this._execution = this._loadExecutionState();
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
        if (this._isExecutionActive() && this._execution.providerName !== getActiveTaskProviderName(this._settings))
            this._resetExecution(TASK_EXECUTION_STATES.idle);

        this._syncTextFileMonitor();
        void this._syncCurrentThing();
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
        this._persistExecutionState();
        this._settings = null;
    }

    /**
     * @returns {boolean} True when manual edits should be accepted
     */
    allowsManualEditing() {
        return getActiveTaskProviderName(this._settings) === TASK_PROVIDERS.manual;
    }

    /**
     * @returns {boolean} True when text file provider is active
     */
    isTextFileProvider() {
        return isTextFileTaskProvider(this._settings);
    }

    /**
     * Starts or resumes execution of the current thing.
     *
     * @returns {Promise<object>} Execution state
     */
    async startCurrentThing() {
        if (!this._settings)
            return this.getCurrentThingExecutionState();

        if (this.allowsManualEditing())
            throw new Error('Manual provider does not support execution.');

        if (this._execution.state === TASK_EXECUTION_STATES.running)
            return this.getCurrentThingExecutionState();

        if (this._execution.state === TASK_EXECUTION_STATES.paused) {
            if (this._execution.conflict)
                throw new Error(this._execution.errorMessage || 'The active thing changed externally.');

            this._execution.state = TASK_EXECUTION_STATES.running;
            this._execution.startedAt = Date.now();
            this._execution.conflict = false;
            this._execution.errorMessage = '';
            this._persistExecutionState();
            return this.getCurrentThingExecutionState();
        }

        const provider = createTaskProvider(this._settings);
        const thingValue = await provider.startCurrentThing();

        this._execution = {
            providerName: getActiveTaskProviderName(this._settings),
            thingValue,
            state: TASK_EXECUTION_STATES.running,
            startedAt: Date.now(),
            accumulatedMs: 0,
            totalMs: 0,
            conflict: false,
            errorMessage: '',
        };
        this._setThingValue(thingValue);
        this._persistExecutionState();
        this._clearLastError();

        return this.getCurrentThingExecutionState();
    }

    /**
     * Pauses execution of the current thing.
     *
     * @returns {Promise<object>} Execution state
     */
    async pauseCurrentThing() {
        if (this._execution.state !== TASK_EXECUTION_STATES.running)
            return this.getCurrentThingExecutionState();

        const provider = createTaskProvider(this._settings);

        await provider.pauseCurrentThing();
        this._execution.accumulatedMs = this._getExecutionElapsedMs();
        this._execution.startedAt = null;
        this._execution.state = TASK_EXECUTION_STATES.paused;
        this._persistExecutionState();
        this._clearLastError();

        return this.getCurrentThingExecutionState();
    }

    /**
     * Stops and completes execution of the current thing.
     *
     * @returns {Promise<object>} Execution state
     */
    async stopCurrentThing() {
        if (!this._isExecutionActive())
            throw new Error('No current thing execution is active.');

        if (this._execution.conflict)
            throw new Error(this._execution.errorMessage || 'The active thing changed externally.');

        const provider = createTaskProvider(this._settings);
        const elapsedMs = this._getExecutionElapsedMs();
        const elapsedLabel = formatExecutionElapsedTime(elapsedMs);

        await provider.stopCurrentThing(this._execution.thingValue, elapsedLabel);

        this._resetExecution(TASK_EXECUTION_STATES.stopped, elapsedMs);
        await this._syncCurrentThing();
        this._clearLastError();

        return this.getCurrentThingExecutionState();
    }

    /**
     * Cancels the current execution without modifying provider data.
     *
     * @returns {Promise<object>} Execution state
     */
    async discardCurrentThing() {
        this._resetExecution(TASK_EXECUTION_STATES.idle);
        await this._syncCurrentThing();
        this._clearLastError();

        return this.getCurrentThingExecutionState();
    }

    /**
     * Gets current execution state for the UI.
     *
     * @returns {object} Execution state snapshot
     */
    getCurrentThingExecutionState() {
        const elapsedMs = this._getExecutionElapsedMs();

        return {
            providerName: this._execution.providerName,
            thingValue: this._execution.thingValue,
            state: this._execution.state,
            elapsedMs,
            elapsedLabel: formatExecutionElapsedTime(elapsedMs),
            isActive: this._isExecutionActive(),
            isRunning: this._execution.state === TASK_EXECUTION_STATES.running,
            isPaused: this._execution.state === TASK_EXECUTION_STATES.paused,
            canPlay: this._execution.state !== TASK_EXECUTION_STATES.running,
            canPause: this._execution.state === TASK_EXECUTION_STATES.running,
            canStop: this._isExecutionActive() && !this._execution.conflict,
            canDiscard: this._isExecutionActive(),
            conflict: this._execution.conflict,
            errorMessage: this._execution.errorMessage,
        };
    }

    /**
     * Gets the text-file popover data.
     *
     * @param {number} [limit=5] - Maximum number of upcoming lines
     * @param {number} [maxLineLength=90] - Maximum length per line
     * @returns {Promise<{fileName: string, canOpen: boolean, nextThings: string[]}>} Popover data
     */
    async getTextFilePopoverData(limit = 5, maxLineLength = 90) {
        if (!this._settings) {
            return {
                fileName: '',
                canOpen: false,
                nextThings: [],
            };
        }

        if (!this.isTextFileProvider()) {
            return {
                fileName: '',
                canOpen: false,
                nextThings: [],
            };
        }

        const file = getConfiguredTextFile(this._settings);

        if (!file) {
            return {
                fileName: '',
                canOpen: false,
                nextThings: [],
            };
        }

        const fileName = file.get_basename() ?? '';
        const canOpen = file.query_exists(null);

        if (!canOpen) {
            return {
                fileName,
                canOpen,
                nextThings: [],
            };
        }

        try {
            const provider = createTaskProvider(this._settings);
            const nextThings = await provider.getNextThings(limit, maxLineLength);

            this._clearLastError();
            return {
                fileName,
                canOpen,
                nextThings,
            };
        } catch (error) {
            this._logProviderError(error);
            return {
                fileName,
                canOpen,
                nextThings: [],
            };
        }
    }

    async _syncCurrentThing() {
        if (!this._settings)
            return;

        if (this.allowsManualEditing())
            return;

        try {
            const provider = createTaskProvider(this._settings);
            const thingValue = await provider.getCurrentThing();

            if (!this._settings)
                return;

            if (this._isExecutionActive()) {
                this._syncExecutionConflict(thingValue);
                return;
            }

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
                void this._syncCurrentThing();
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

    _syncExecutionConflict(thingValue) {
        if (thingValue === this._execution.thingValue) {
            this._execution.conflict = false;
            this._execution.errorMessage = '';
            return;
        }

        this._execution.conflict = true;
        this._execution.errorMessage = 'The text file current thing changed while execution is active.';
    }

    _getExecutionElapsedMs() {
        if (this._execution.state === TASK_EXECUTION_STATES.running && this._execution.startedAt)
            return this._execution.accumulatedMs + (Date.now() - this._execution.startedAt);

        if (this._execution.state === TASK_EXECUTION_STATES.stopped)
            return this._execution.totalMs;

        return this._execution.accumulatedMs;
    }

    _isExecutionActive() {
        return ACTIVE_EXECUTION_STATES.has(this._execution.state);
    }

    _resetExecution(state, totalMs = 0) {
        this._execution = this._createExecutionState(state, totalMs);
        this._persistExecutionState();
    }

    _createExecutionState(state = TASK_EXECUTION_STATES.idle, totalMs = 0) {
        return {
            providerName: '',
            thingValue: '',
            state,
            startedAt: null,
            accumulatedMs: 0,
            totalMs,
            conflict: false,
            errorMessage: '',
        };
    }

    _loadExecutionState() {
        const state = this._settings.get_string(SETTINGS_KEYS.executionState);

        if (!VALID_EXECUTION_STATES.has(state))
            return this._createExecutionState();

        const execution = {
            providerName: this._settings.get_string(SETTINGS_KEYS.executionProvider),
            thingValue: this._settings.get_string(SETTINGS_KEYS.executionThingValue),
            state,
            startedAt: getNumericSetting(this._settings, SETTINGS_KEYS.executionStartedAtMs),
            accumulatedMs: getNumericSetting(this._settings, SETTINGS_KEYS.executionAccumulatedMs),
            totalMs: getNumericSetting(this._settings, SETTINGS_KEYS.executionTotalMs),
            conflict: false,
            errorMessage: '',
        };

        if (!this._isPersistedExecutionValid(execution))
            return this._createExecutionState();

        return execution;
    }

    _isPersistedExecutionValid(execution) {
        if (!ACTIVE_EXECUTION_STATES.has(execution.state))
            return true;

        if (execution.providerName === '' || execution.thingValue === '')
            return false;

        if (execution.state === TASK_EXECUTION_STATES.running && execution.startedAt <= 0)
            return false;

        return true;
    }

    _persistExecutionState() {
        if (!this._settings)
            return;

        this._settings.set_string(SETTINGS_KEYS.executionState, this._execution.state);
        this._settings.set_string(SETTINGS_KEYS.executionProvider, this._execution.providerName);
        this._settings.set_string(SETTINGS_KEYS.executionThingValue, this._execution.thingValue);
        this._settings.set_string(SETTINGS_KEYS.executionStartedAtMs, stringifyNumber(this._execution.startedAt));
        this._settings.set_string(SETTINGS_KEYS.executionAccumulatedMs, stringifyNumber(this._execution.accumulatedMs));
        this._settings.set_string(SETTINGS_KEYS.executionTotalMs, stringifyNumber(this._execution.totalMs));
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

/**
 * Formats elapsed execution time for display and done suffixes.
 *
 * @param {number} elapsedMs - Elapsed milliseconds
 * @returns {string} Human readable elapsed time
 */
function formatExecutionElapsedTime(elapsedMs) {
    const totalMinutes = Math.max(0, Math.floor(elapsedMs / 60000));

    if (totalMinutes < 60)
        return `${totalMinutes} min`;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (minutes === 0)
        return `${hours}h`;

    return `${hours}h ${minutes}min`;
}

/**
 * Gets a persisted non-negative number from a string GSettings key.
 *
 * @param {object} settings - Extension settings
 * @param {string} key - Settings key
 * @returns {number} Parsed number or zero
 */
function getNumericSetting(settings, key) {
    const value = Number.parseInt(settings.get_string(key), 10);

    if (!Number.isFinite(value) || value < 0)
        return 0;

    return value;
}

/**
 * Converts nullable numbers to persisted string values.
 *
 * @param {number|null} value - Number to persist
 * @returns {string} Persisted string value
 */
function stringifyNumber(value) {
    if (!Number.isFinite(value) || value < 0)
        return '0';

    return `${Math.floor(value)}`;
}
