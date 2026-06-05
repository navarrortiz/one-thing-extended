import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {SETTINGS_KEYS} from '../shared/constants.js';
import {addChild} from './compat.js';
import {createPanelText} from './panelText.js';
import {createPopupEntry} from './popupEntry.js';

const Widget = new GObject.registerClass(
    class Widget extends PanelMenu.Button {
        _init(settings, dir) {
            super._init(0, 'AppWidget', false);

            this._settings = settings;
            this._dir = dir;
            this._extension = Extension.lookupByURL(import.meta.url);

            this._buildUi();
            this._connectEvents();
        }

        _buildUi() {
            this.panelText = createPanelText(this._settings);

            const {inputText, menuItem} = createPopupEntry(
                this._settings,
                () => this._openPreferences()
            );

            this.inputText = inputText;
            this.menu.addMenuItem(menuItem);
            this._buildContainer();
            this.syncIconVisibility(this.panelText.get_text());
        }

        _buildContainer() {
            const container = new St.BoxLayout();
            const iconPath = this._dir
                .get_child('assets')
                .get_child('one-thing-gnome.svg')
                .get_path();

            this.icon = new St.Icon({
                icon_name: 'one-thing-gnome',
                icon_size: 24,
                gicon: Gio.icon_new_for_string(iconPath),
            });

            addChild(container, this.icon);
            addChild(container, this.panelText);
            addChild(this, container);
        }

        _connectEvents() {
            this.connect('button-press-event', () => this.focusInput());
            this.inputText.clutter_text.connect('activate', actor => {
                this._onActivateEntry(actor);
            });
        }

        _openPreferences() {
            this._extension.openPreferences();
            this.menu.close();
        }

        _onActivateEntry(actor) {
            const textValue = actor.get_text();

            this.syncIconVisibility(textValue);
            this.panelText.set_text(textValue);
            this._settings.set_string(SETTINGS_KEYS.thingValue, textValue);
            this.menu.close();
        }

        focusInput() {
            const text = this._settings.get_string(SETTINGS_KEYS.thingValue);

            if (!this.menu.isOpen)
                return;

            this.inputText.grab_key_focus();
            this.inputText.set_text(text);
            if (text)
                this.inputText.clutter_text.set_selection(-1, 0);
        }

        syncIconVisibility(text) {
            if (text === '')
                this.icon.show();
            else
                this.icon.hide();
        }
    }
);

export default Widget;
