import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

import {syncKeybinding, removeKeybinding} from './keybindings.js';
import {installMenuOpenHandler} from './menuOpenHandler.js';
import PanelManager from './panelManager.js';
import SettingsConnections from './settingsConnections.js';
import TaskProviderManager from './taskProviderManager.js';
import {SETTINGS_KEYS} from '../shared/constants.js';

export default class ExtensionController {
    constructor(extension) {
        this._extension = extension;
        this._injectionManager = null;
        this._panelManager = null;
        this._settings = null;
        this._settingsConnections = null;
        this._taskProviderManager = null;
    }

    enable() {
        this._injectionManager = new InjectionManager();
        this._settings = this._extension.getSettings();
        this._taskProviderManager = new TaskProviderManager(this._settings);
        this._panelManager = new PanelManager(
            this._settings,
            this._extension.dir,
            this._taskProviderManager,
            () => this._extension.openPreferences()
        );
        this._settingsConnections = new SettingsConnections(this._settings);

        installMenuOpenHandler(this._injectionManager, () => {
            this._panelManager.focusInputWithDelay();
        });

        this._settingsConnections.connectMany([
            [SETTINGS_KEYS.thingValue, () => this._panelManager.syncPanelTextVisibility()],
            [SETTINGS_KEYS.taskProvider, () => this._syncTaskProvider()],
            [SETTINGS_KEYS.textFilePath, () => this._taskProviderManager.sync()],
            [SETTINGS_KEYS.hotKeyEnabled, () => this._syncKeybinding()],
            [SETTINGS_KEYS.statusBarIndex, () => this._panelManager.placeWidget()],
            [SETTINGS_KEYS.statusBarLocation, () => this._panelManager.placeWidget()],
        ]);

        this._taskProviderManager.enable();
        this._panelManager.placeWidget();
        this._syncKeybinding();
    }

    disable() {
        this._injectionManager?.clear();
        this._injectionManager = null;

        this._panelManager?.destroy();
        this._panelManager = null;

        this._taskProviderManager?.destroy();
        this._taskProviderManager = null;

        this._settingsConnections?.disconnectAll();
        this._settingsConnections = null;

        this._settings = null;
        removeKeybinding();
    }

    _syncKeybinding() {
        syncKeybinding(this._settings, () => this._panelManager.openMenu());
    }

    _syncTaskProvider() {
        this._taskProviderManager.sync();
        this._panelManager.syncProviderMode();
    }
}
