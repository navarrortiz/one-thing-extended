import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import Widget from '../ui/widget.js';
import {
    LOCATION_BY_INDEX,
    MENU_FOCUS_DELAY_MS,
    RIGHT_BOX_LOCATION_INDEX,
    SETTINGS_KEYS,
    STATUS_AREA_NAME
} from '../shared/constants.js';

const [major] = Config.PACKAGE_VERSION.split('.');
const GNOME_MAJOR_VERSION = Number.parseInt(major);

export default class PanelManager {
    constructor(settings, dir, thingProviderManager, onPreferencesOpen) {
        this._settings = settings;
        this._dir = dir;
        this._thingProviderManager = thingProviderManager;
        this._onPreferencesOpen = onPreferencesOpen;
        this._widget = null;
        this._actorAddedSignal = null;
        this._focusTimeoutId = null;
    }

    placeWidget() {
        const index = this._settings.get_int(SETTINGS_KEYS.statusBarIndex);
        const locationIndex = this._settings.get_int(SETTINGS_KEYS.statusBarLocation);
        const location = LOCATION_BY_INDEX[locationIndex];

        this.destroy();

        this._widget = new Widget(
            this._settings,
            this._dir,
            this._thingProviderManager,
            this._onPreferencesOpen
        );
        Main.panel.addToStatusArea(STATUS_AREA_NAME, this._widget, index, location);
        this._syncRightBoxObserver();
    }

    openMenu() {
        this._widget?.menu.open();
    }

    focusInputWithDelay() {
        if (!this._widget?.menu.isOpen)
            return;

        this._clearFocusTimeout();
        this._focusTimeoutId = setTimeout(() => {
            this._focusTimeoutId = null;
            this._widget?.focusInput();
        }, MENU_FOCUS_DELAY_MS);
    }

    syncPanelTextVisibility() {
        this._widget?.syncPanelTextDisplay();
    }

    syncProviderMode() {
        this._widget?.syncProviderMode();
    }

    destroy() {
        this._disconnectRightBoxObserver();
        this._clearFocusTimeout();

        try {
            if (this._widget) {
                this._widget.destroy();
                this._widget = null;
            }

            if (Main.panel.statusArea[STATUS_AREA_NAME])
                Main.panel.statusArea[STATUS_AREA_NAME].destroy();
        } catch (e) {
        }
    }

    _syncRightBoxObserver() {
        if (this._settings.get_int(SETTINGS_KEYS.statusBarLocation) !== RIGHT_BOX_LOCATION_INDEX)
            return;

        const signalName = GNOME_MAJOR_VERSION >= 46 ? 'child-added' : 'actor-added';
        this._actorAddedSignal = Main.panel._rightBox.connect(signalName, () => {
            this.placeWidget();
        });
    }

    _disconnectRightBoxObserver() {
        if (!this._actorAddedSignal)
            return;

        Main.panel._rightBox.disconnect(this._actorAddedSignal);
        this._actorAddedSignal = null;
    }

    _clearFocusTimeout() {
        if (!this._focusTimeoutId)
            return;

        clearTimeout(this._focusTimeoutId);
        this._focusTimeoutId = null;
    }
}
