import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
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
        _init(settings, dir, taskProviderManager) {
            super._init(0, 'AppWidget', false);

            this._settings = settings;
            this._dir = dir;
            this._taskProviderManager = taskProviderManager;
            this._extension = Extension.lookupByURL(import.meta.url);

            this._buildUi();
            this._connectEvents();
        }

        _buildUi() {
            this.panelText = createPanelText(
                this._settings,
                {
                    canOpenFile: () => this._taskProviderManager.usesTextFileProvider(),
                    onOpenFile: () => this._openConfiguredTextFile(),
                    onOpenSettings: () => this._openPreferences(),
                }
            );

            const {inputText, menuItem} = createPopupEntry(
                this._settings,
                () => this._openPreferences()
            );

            this.inputText = inputText;
            this.menu.addMenuItem(menuItem);
            this._buildContainer();
            this.syncProviderMode();
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
            this.menu.connect('open-state-changed', (_menu, isOpen) => {
                this._onMenuOpenStateChanged(isOpen);
            });
            this.inputText.clutter_text.connect('activate', actor => {
                this._onActivateEntry(actor);
            });
        }

        _openPreferences() {
            this._extension.openPreferences();
            this.menu.close();
        }

        _onMenuOpenStateChanged(isOpen) {
            if (!isOpen)
                return;

            if (!this._taskProviderManager.allowsManualEditing()) {
                this.menu.close();
                GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                    this._openConfiguredTextFile();
                    return GLib.SOURCE_REMOVE;
                });
                return;
            }

            this.focusInput();
        }

        _onActivateEntry(actor) {
            if (!this._taskProviderManager.allowsManualEditing()) {
                this._taskProviderManager.sync();
                this.menu.close();
                return;
            }

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

            this.syncProviderMode();
            this.inputText.grab_key_focus();
            this.inputText.set_text(text);
            if (text)
                this.inputText.clutter_text.set_selection(-1, 0);
        }

        syncProviderMode() {
            this.inputText.clutter_text.set_editable(
                this._taskProviderManager.allowsManualEditing()
            );
        }

        syncIconVisibility(text) {
            if (text === '')
                this.icon.show();
            else
                this.icon.hide();
        }

        _openConfiguredTextFile() {
            return this._taskProviderManager.openConfiguredTextFile();
        }
    }
);

export default Widget;
