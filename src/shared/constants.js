export const SETTINGS_KEYS = Object.freeze({
    thingValue: 'thing-value',
    taskProvider: 'task-provider',
    executionState: 'execution-state',
    executionProvider: 'execution-provider',
    executionThingValue: 'execution-thing-value',
    executionStartedAtMs: 'execution-started-at-ms',
    executionAccumulatedMs: 'execution-accumulated-ms',
    executionTotalMs: 'execution-total-ms',
    textFilePath: 'text-file-path',
    textFilePreviewLimit: 'text-file-preview-limit',
    panelFontFamily: 'panel-font-family',
    panelFontColor: 'panel-font-color',
    panelFontSize: 'panel-font-size',
    hotKeyEnabled: 'hot-key',
    statusBarIndex: 'index-in-status-bar',
    statusBarLocation: 'location-in-status-bar',
    showSettingsButton: 'show-settings-button-on-popup',
});

export const TASK_PROVIDERS = Object.freeze({
    manual: 'manual',
    textFile: 'text-file',
});

export const TASK_EXECUTION_STATES = Object.freeze({
    idle: 'idle',
    running: 'running',
    paused: 'paused',
    stopped: 'stopped',
});

export const STATUS_AREA_NAME = 'one-thing-extended';

export const LOCATION_BY_INDEX = Object.freeze({
    0: 'left',
    1: 'center',
    2: 'right',
});

export const MENU_FOCUS_DELAY_MS = 100;
export const RIGHT_BOX_LOCATION_INDEX = 2;
export const EXECUTION_TIMER_INTERVAL_SECONDS = 60;
