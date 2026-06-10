import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {SETTINGS_KEYS} from '../shared/constants.js';
import {addChild} from './compat.js';
import {createPanelText} from './panelText.js';
import {createPopupEntry} from './popupEntry.js';

const Widget = new GObject.registerClass(
    class Widget extends PanelMenu.Button {
        _init(settings, dir, taskProviderManager, onPreferencesOpen) {
            super._init(0.5, 'AppWidget', false);

            this._settings = settings;
            this._dir = dir;
            this._taskProviderManager = taskProviderManager;
            this._onPreferencesOpen = onPreferencesOpen;
            this._textFileLineItems = [];
            this._menuOpenStateChangedSignalId = null;
            this._inputActivateSignalId = null;

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
            this._manualMenuItem = menuItem;
            this.menu.addMenuItem(this._manualMenuItem);
            this._buildTextFilePopoverMenu();
            this._buildContainer();
            this.syncProviderMode();
            this.syncIconVisibility(this.panelText.get_text());
        }

        _buildTextFilePopoverMenu() {
            this._textFileOpenItem = new PopupMenu.PopupMenuItem('Open text file');
            this._textFileOpenItem.connect('activate', () => {
                this._openConfiguredTextFile();
                this.menu.close();
            });

            this._textFileTopSeparator = new PopupMenu.PopupSeparatorMenuItem();
            this._textFileHeaderItem = new PopupMenu.PopupMenuItem('Next Things:', {
                reactive: false,
                can_focus: false,
            });

            for (let index = 0; index < 20; index++) {
                const lineItem = new PopupMenu.PopupMenuItem('', {
                    reactive: false,
                    can_focus: false,
                });

                this._textFileLineItems.push(lineItem);
            }

            this._textFileBottomSeparator = new PopupMenu.PopupSeparatorMenuItem();
            this._textFileSettingsItem = new PopupMenu.PopupMenuItem('Settings');
            this._textFileSettingsItem.connect('activate', () => {
                this._openPreferences();
            });

            this.menu.addMenuItem(this._textFileOpenItem);
            this.menu.addMenuItem(this._textFileTopSeparator);
            this.menu.addMenuItem(this._textFileHeaderItem);
            for (const lineItem of this._textFileLineItems)
                this.menu.addMenuItem(lineItem);
            this.menu.addMenuItem(this._textFileBottomSeparator);
            this.menu.addMenuItem(this._textFileSettingsItem);

            this._setTextFilePopoverVisible(false);
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
            this._menuOpenStateChangedSignalId = this.menu.connect('open-state-changed', (_menu, isOpen) => {
                this._onMenuOpenStateChanged(isOpen);
            });
            this._inputActivateSignalId = this.inputText.clutter_text.connect('activate', actor => {
                this._onActivateEntry(actor);
            });
        }

        destroy() {
            if (this._menuOpenStateChangedSignalId) {
                this.menu.disconnect(this._menuOpenStateChangedSignalId);
                this._menuOpenStateChangedSignalId = null;
            }

            if (this._inputActivateSignalId) {
                this.inputText.clutter_text.disconnect(this._inputActivateSignalId);
                this._inputActivateSignalId = null;
            }

            super.destroy();
        }

        _openPreferences() {
            this._onPreferencesOpen();
            this.menu.close();
        }

        _onMenuOpenStateChanged(isOpen) {
            if (!isOpen)
                return;

            if (this._taskProviderManager.isTextFileProvider()) {
                void this._refreshTextFilePopover();
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

            if (!this._taskProviderManager.allowsManualEditing())
                return;

            this.syncProviderMode();
            this.inputText.grab_key_focus();
            this.inputText.set_text(text);
            if (text)
                this.inputText.clutter_text.set_selection(-1, 0);
        }

        syncProviderMode() {
            const allowsManualEditing = this._taskProviderManager.allowsManualEditing();
            const isTextFileProvider = this._taskProviderManager.isTextFileProvider();

            this.inputText.clutter_text.set_editable(allowsManualEditing);
            setMenuItemVisible(this._manualMenuItem, allowsManualEditing);
            this._setTextFilePopoverVisible(isTextFileProvider);
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

        async _refreshTextFilePopover() {
            const previewLimit = this._settings.get_int(SETTINGS_KEYS.textFilePreviewLimit);
            const popoverData = await this._taskProviderManager.getTextFilePopoverData(previewLimit);

            if (!this.menu.isOpen || !this._taskProviderManager.isTextFileProvider())
                return;

            const fileName = popoverData.fileName || 'text file';
            const nextThings = popoverData.nextThings.slice(0, previewLimit);

            this._textFileOpenItem.label.set_text(`Open ${fileName}`);
            this._textFileOpenItem.setSensitive(popoverData.canOpen);
            this._textFileHeaderItem.label.set_text(`Next ${previewLimit} Things:`);

            for (let index = 0; index < this._textFileLineItems.length; index++) {
                const item = this._textFileLineItems[index];

                if (index < nextThings.length) {
                    item.label.set_text(`- ${nextThings[index]}`);
                    item.show();
                } else {
                    item.hide();
                }
            }
        }

        _setTextFilePopoverVisible(visible) {
            setMenuItemVisible(this._textFileOpenItem, visible);
            setMenuItemVisible(this._textFileTopSeparator, visible);
            setMenuItemVisible(this._textFileHeaderItem, visible);
            setMenuItemVisible(this._textFileBottomSeparator, visible);
            setMenuItemVisible(this._textFileSettingsItem, visible);

            for (const lineItem of this._textFileLineItems)
                setMenuItemVisible(lineItem, visible);
        }
    }
);

/**
 * Shows or hides a popup menu item.
 *
 * @param {object} item - Popup menu item instance
 * @param {boolean} visible - Whether the item should be visible
 */
function setMenuItemVisible(item, visible) {
    if (visible)
        item.show();
    else
        item.hide();
}

export default Widget;
