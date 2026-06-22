import {InjectionManager} from 'resource:///org/gnome/shell/extensions/extension.js';

import {syncKeybinding, removeKeybinding} from './keybindings.js';
import {installMenuOpenHandler} from './menuOpenHandler.js';
import PanelManager from './panelManager.js';
import SettingsConnections from './settingsConnections.js';
import ThingProviderManager from './thingProviderManager.js';
import {SETTINGS_KEYS} from '../shared/constants.js';

export default class ExtensionController {
    constructor(extension) {
        this._extension = extension;
        this._injectionManager = null;
        this._panelManager = null;
        this._settings = null;
        this._settingsConnections = null;
        this._thingProviderManager = null;
    }

    enable() {
        this._injectionManager = new InjectionManager();
        this._settings = this._extension.getSettings();
        this._thingProviderManager = new ThingProviderManager(this._settings);
        this._panelManager = new PanelManager(
            this._settings,
            this._extension.dir,
            this._thingProviderManager,
            () => this._extension.openPreferences()
        );
        this._settingsConnections = new SettingsConnections(this._settings);

        installMenuOpenHandler(this._injectionManager, () => {
            this._panelManager.focusInputWithDelay();
        });

        this._settingsConnections.connectMany([
            [SETTINGS_KEYS.thingValue, () => this._panelManager.syncPanelTextVisibility()],
            [SETTINGS_KEYS.thingProvider, () => this._syncThingProvider()],
            [SETTINGS_KEYS.textFilePath, () => this._thingProviderManager.sync()],
            [SETTINGS_KEYS.textFilePaths, () => this._thingProviderManager.sync()],
            [SETTINGS_KEYS.textFileActivePath, () => this._thingProviderManager.sync()],
            [SETTINGS_KEYS.hotKeyEnabled, () => this._syncKeybinding()],
            [SETTINGS_KEYS.statusBarIndex, () => this._panelManager.placeWidget()],
            [SETTINGS_KEYS.statusBarLocation, () => this._panelManager.placeWidget()],
        ]);

        this._thingProviderManager.enable();
        this._panelManager.placeWidget();
        this._syncKeybinding();
    }

    disable() {
        this._injectionManager?.clear();
        this._injectionManager = null;

        this._panelManager?.destroy();
        this._panelManager = null;

        this._thingProviderManager?.destroy();
        this._thingProviderManager = null;

        this._settingsConnections?.disconnectAll();
        this._settingsConnections = null;

        this._settings = null;
        removeKeybinding();
    }

    _syncKeybinding() {
        syncKeybinding(this._settings, () => this._panelManager.openMenu());
    }

    _syncThingProvider() {
        this._thingProviderManager.sync();
        this._panelManager.syncProviderMode();
    }
}
