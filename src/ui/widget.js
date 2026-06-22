import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Dialog from 'resource:///org/gnome/shell/ui/dialog.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as ModalDialog from 'resource:///org/gnome/shell/ui/modalDialog.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {
    EXECUTION_TIMER_INTERVAL_SECONDS,
    SETTINGS_KEYS,
    THING_EXECUTION_STATES
} from '../shared/constants.js';
import {addChild} from './compat.js';
import {createPanelText, getPanelTextStyle} from './panelText.js';
import {createPopupEntry} from './popupEntry.js';

const Widget = new GObject.registerClass(
    class Widget extends PanelMenu.Button {
        _init(settings, dir, thingProviderManager, onPreferencesOpen) {
            super._init(0.5, 'AppWidget', false);

            this._settings = settings;
            this._dir = dir;
            this._thingProviderManager = thingProviderManager;
            this._onPreferencesOpen = onPreferencesOpen;
            this._textFileLineItems = [];
            this._menuOpenStateChangedSignalId = null;
            this._inputActivateSignalId = null;
            this._executionTimerId = null;
            this._executionButtonSignalIds = [];
            this._panelStyleSignalIds = [];

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
            this.syncPanelTextDisplay();
        }

        _buildTextFilePopoverMenu() {
            this._buildTextFileExecutionMenu();

            this._textFileActiveFileItem = new PopupMenu.PopupSubMenuMenuItem(_('Active file'));
            this._textFileOpenItem = new PopupMenu.PopupMenuItem(_('Open text file'));
            this._textFileOpenItem.connect('activate', () => {
                this._openConfiguredTextFile();
                this.menu.close();
            });

            this._textFileTopSeparator = new PopupMenu.PopupSeparatorMenuItem();
            this._textFileHeaderItem = new PopupMenu.PopupMenuItem(_('Next Things:'), {
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
            this._textFileSettingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            this._textFileSettingsItem.connect('activate', () => {
                this._openPreferences();
            });

            this.menu.addMenuItem(this._textFileExecutionControlsItem);
            this.menu.addMenuItem(this._textFileExecutionSeparator);
            this.menu.addMenuItem(this._textFileActiveFileItem);
            this.menu.addMenuItem(this._textFileOpenItem);
            this.menu.addMenuItem(this._textFileTopSeparator);
            this.menu.addMenuItem(this._textFileHeaderItem);
            for (const lineItem of this._textFileLineItems)
                this.menu.addMenuItem(lineItem);
            this.menu.addMenuItem(this._textFileBottomSeparator);
            this.menu.addMenuItem(this._textFileSettingsItem);

            this._setTextFilePopoverVisible(false);
        }

        _buildTextFileExecutionMenu() {
            const controlsBox = new St.BoxLayout({
                x_expand: true,
                style: 'spacing: 6px;',
            });

            this._textFileExecutionControlsItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false,
            });
            this._textFilePlayButton = createExecutionButton(_('Play'));
            this._textFilePauseButton = createExecutionButton(_('Pause'));
            this._textFileStopButton = createExecutionButton(_('Stop'));
            this._textFileDiscardButton = createExecutionButton(_('Discard'));
            this._textFileExecutionSeparator = new PopupMenu.PopupSeparatorMenuItem();

            addChild(controlsBox, this._textFilePlayButton);
            addChild(controlsBox, this._textFilePauseButton);
            addChild(controlsBox, this._textFileStopButton);
            addChild(controlsBox, this._textFileDiscardButton);
            addChild(this._textFileExecutionControlsItem, controlsBox);

            this._connectExecutionButton(this._textFilePlayButton, () => {
                void this._startCurrentThing();
            });
            this._connectExecutionButton(this._textFilePauseButton, () => {
                void this._pauseCurrentThing();
            });
            this._connectExecutionButton(this._textFileStopButton, () => {
                this._confirmStopCurrentThing();
            });
            this._connectExecutionButton(this._textFileDiscardButton, () => {
                this._confirmDiscardCurrentThing();
            });
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
            this.executionStatusContainer = new St.BoxLayout({
                y_align: Clutter.ActorAlign.CENTER,
                style: 'spacing: 4px; margin-left: 12px;',
            });
            this.executionStatusDot = new St.Widget({
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.executionStatusTimeText = createPanelText(this._settings);
            this.executionStatusTimeText.set_text('');
            addChild(this.executionStatusContainer, this.executionStatusDot);
            addChild(this.executionStatusContainer, this.executionStatusTimeText);
            addChild(container, this.executionStatusContainer);
            addChild(this, container);
        }

        _connectEvents() {
            this._menuOpenStateChangedSignalId = this.menu.connect('open-state-changed', (_menu, isOpen) => {
                this._onMenuOpenStateChanged(isOpen);
            });
            this._inputActivateSignalId = this.inputText.clutter_text.connect('activate', actor => {
                this._onActivateEntry(actor);
            });
            this._connectPanelStyleSignals();
        }

        destroy() {
            this._clearExecutionTimer();
            this._disconnectExecutionButtonSignals();
            this._disconnectPanelStyleSignals();

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

            if (this._thingProviderManager.isTextFileProvider()) {
                void this._refreshTextFilePopover();
                return;
            }

            this.focusInput();
        }

        _onActivateEntry(actor) {
            if (!this._thingProviderManager.allowsManualEditing()) {
                this._thingProviderManager.sync();
                this.menu.close();
                return;
            }

            const textValue = actor.get_text();

            this.panelText.set_text(textValue);
            this._settings.set_string(SETTINGS_KEYS.thingValue, textValue);
            this.syncPanelTextDisplay();
            this.menu.close();
        }

        focusInput() {
            const text = this._settings.get_string(SETTINGS_KEYS.thingValue);

            if (!this.menu.isOpen)
                return;

            if (!this._thingProviderManager.allowsManualEditing())
                return;

            this.syncProviderMode();
            this.inputText.grab_key_focus();
            this.inputText.set_text(text);
            if (text)
                this.inputText.clutter_text.set_selection(-1, 0);
        }

        syncProviderMode() {
            const allowsManualEditing = this._thingProviderManager.allowsManualEditing();
            const isTextFileProvider = this._thingProviderManager.isTextFileProvider();

            this.inputText.clutter_text.set_editable(allowsManualEditing);
            setMenuItemVisible(this._manualMenuItem, allowsManualEditing);
            this._setTextFilePopoverVisible(isTextFileProvider);
            this._refreshExecutionControls();
            this.syncPanelTextDisplay();
        }

        syncIconVisibility(text) {
            if (text === '')
                this.icon.show();
            else
                this.icon.hide();
        }

        syncPanelTextDisplay() {
            const thingValue = this._settings.get_string(SETTINGS_KEYS.thingValue);

            this.panelText.set_text(thingValue);
            this._syncPanelExecutionStatus();
            this.syncIconVisibility(thingValue);
        }

        _openConfiguredTextFile() {
            return this._thingProviderManager.openConfiguredTextFile();
        }

        async _refreshTextFilePopover() {
            const previewLimit = this._settings.get_int(SETTINGS_KEYS.textFilePreviewLimit);
            const popoverData = await this._thingProviderManager.getTextFilePopoverData(previewLimit);

            if (!this.menu.isOpen || !this._thingProviderManager.isTextFileProvider())
                return;

            const fileName = popoverData.fileName || 'text file';
            const nextThings = popoverData.nextThings.slice(0, previewLimit);

            this._refreshExecutionControls();
            this._refreshTextFileActiveFileMenu(popoverData);
            this._textFileOpenItem.label.set_text(`${_('Open')} ${fileName}`);
            this._textFileOpenItem.setSensitive(popoverData.canOpen);
            this._textFileHeaderItem.label.set_text(`${_('Next')} ${previewLimit} ${_('Things')}:`);

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
            setMenuItemVisible(this._textFileExecutionControlsItem, visible);
            setMenuItemVisible(this._textFileExecutionSeparator, visible);
            setMenuItemVisible(this._textFileActiveFileItem, visible);
            setMenuItemVisible(this._textFileOpenItem, visible);
            setMenuItemVisible(this._textFileTopSeparator, visible);
            setMenuItemVisible(this._textFileHeaderItem, visible);
            setMenuItemVisible(this._textFileBottomSeparator, visible);
            setMenuItemVisible(this._textFileSettingsItem, visible);

            for (const lineItem of this._textFileLineItems)
                setMenuItemVisible(lineItem, visible);
        }

        _refreshTextFileActiveFileMenu(popoverData) {
            this._textFileActiveFileItem.menu.removeAll();

            if (popoverData.fileEntries.length === 0) {
                this._textFileActiveFileItem.label.set_text(_('No text files'));
                this._textFileActiveFileItem.setSensitive(false);
                return;
            }

            this._textFileActiveFileItem.setSensitive(true);
            this._textFileActiveFileItem.label.set_text(`${_('Active file')}: ${popoverData.fileName}`);

            for (const entry of popoverData.fileEntries) {
                const label = entry.isActive ? `* ${entry.fileName}` : entry.fileName;

                this._textFileActiveFileItem.menu.addAction(label, () => {
                    this._thingProviderManager.setActiveTextFilePath(entry.path);
                    void this._refreshTextFilePopover();
                });
            }
        }

        async _startCurrentThing() {
            await this._runExecutionAction(() => this._thingProviderManager.startCurrentThing());
        }

        async _pauseCurrentThing() {
            await this._runExecutionAction(() => this._thingProviderManager.pauseCurrentThing());
        }

        _confirmStopCurrentThing() {
            const dialog = new ConfirmCurrentThingExecutionDialog({
                title: _('Stop current thing?'),
                description: _('This will mark the current Thing as done.'),
                confirmLabel: _('Stop'),
                onConfirm: () => {
                    void this._stopCurrentThing();
                },
            });

            dialog.open();
        }

        _confirmDiscardCurrentThing() {
            const dialog = new ConfirmCurrentThingExecutionDialog({
                title: _('Discard current execution?'),
                description: _('This will cancel the current execution.'),
                confirmLabel: _('Discard'),
                onConfirm: () => {
                    void this._discardCurrentThing();
                },
            });

            dialog.open();
        }

        async _stopCurrentThing() {
            await this._runExecutionAction(() => this._thingProviderManager.stopCurrentThing());
            void this._refreshTextFilePopover();
        }

        async _discardCurrentThing() {
            await this._runExecutionAction(() => this._thingProviderManager.discardCurrentThing());
            void this._refreshTextFilePopover();
        }

        async _runExecutionAction(action) {
            try {
                await action();
            } catch (error) {
                const message = error?.message ?? `${error}`;

                Main.notify(_('One Thing'), message);
                logError(error, 'One Thing execution action error');
            }

            this._refreshExecutionControls();
        }

        _refreshExecutionControls() {
            if (!this._thingProviderManager?.isTextFileProvider()) {
                this._clearExecutionTimer();
                return;
            }

            const state = this._thingProviderManager.getCurrentThingExecutionState();

            setExecutionButtonEnabled(this._textFilePlayButton, state.canPlay && !state.conflict);
            setExecutionButtonEnabled(this._textFilePauseButton, state.canPause);
            setExecutionButtonEnabled(this._textFileStopButton, state.canStop);
            setExecutionButtonEnabled(this._textFileDiscardButton, state.canDiscard);
            this.syncPanelTextDisplay();
            this._syncExecutionTimer(state);
        }

        _syncPanelExecutionStatus() {
            if (!this._thingProviderManager?.isTextFileProvider()) {
                this.executionStatusContainer.hide();
                return;
            }

            const state = this._thingProviderManager.getCurrentThingExecutionState();

            if (state.state === THING_EXECUTION_STATES.running) {
                this._setPanelExecutionStatus('#33d17a', state.elapsedLabel);
                return;
            }

            if (state.state === THING_EXECUTION_STATES.paused) {
                this._setPanelExecutionStatus('#9a9996', state.elapsedLabel);
                return;
            }

            this.executionStatusContainer.hide();
        }

        _setPanelExecutionStatus(color, elapsedLabel) {
            this.executionStatusDot.set_style(
                `background-color: ${color}; border-radius: 5px; min-width: 10px; min-height: 10px;`
            );
            this.executionStatusTimeText.set_text(elapsedLabel);
            this.executionStatusTimeText.set_style(getPanelTextStyle(this._settings, color));
            this.executionStatusContainer.show();
        }

        _syncExecutionTimer(state) {
            if (!state.isRunning) {
                this._clearExecutionTimer();
                return;
            }

            if (this._executionTimerId)
                return;

            this._executionTimerId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                EXECUTION_TIMER_INTERVAL_SECONDS,
                () => {
                    this._executionTimerId = null;
                    this._refreshExecutionControls();

                    const nextState = this._thingProviderManager.getCurrentThingExecutionState();

                    if (!nextState.isRunning)
                        return GLib.SOURCE_REMOVE;

                    this._syncExecutionTimer(nextState);
                    return GLib.SOURCE_REMOVE;
                }
            );
        }

        _clearExecutionTimer() {
            if (!this._executionTimerId)
                return;

            GLib.Source.remove(this._executionTimerId);
            this._executionTimerId = null;
        }

        _connectExecutionButton(button, callback) {
            const signalId = button.connect('clicked', callback);

            this._executionButtonSignalIds.push([button, signalId]);
        }

        _disconnectExecutionButtonSignals() {
            for (const [button, signalId] of this._executionButtonSignalIds)
                button.disconnect(signalId);

            this._executionButtonSignalIds = [];
        }

        _connectPanelStyleSignals() {
            this._panelStyleSignalIds = [
                this._settings.connect(`changed::${SETTINGS_KEYS.panelFontFamily}`, () => {
                    this.syncPanelTextDisplay();
                }),
                this._settings.connect(`changed::${SETTINGS_KEYS.panelFontSize}`, () => {
                    this.syncPanelTextDisplay();
                }),
                this._settings.connect(`changed::${SETTINGS_KEYS.panelFontColor}`, () => {
                    this.syncPanelTextDisplay();
                }),
            ];
        }

        _disconnectPanelStyleSignals() {
            for (const signalId of this._panelStyleSignalIds)
                this._settings.disconnect(signalId);

            this._panelStyleSignalIds = [];
        }
    }
);

const ConfirmCurrentThingExecutionDialog = GObject.registerClass(
    class ConfirmCurrentThingExecutionDialog extends ModalDialog.ModalDialog {
        _init({title, description, confirmLabel, onConfirm}) {
            super._init();

            const content = new Dialog.MessageDialogContent({
                title,
                description,
            });

            this.contentLayout.add_child(content);
            this.addButton({
                label: _('Cancel'),
                action: () => this.close(),
                default: true,
                key: Clutter.KEY_Escape,
            });
            this.addButton({
                label: confirmLabel,
                action: () => {
                    onConfirm();
                    this.close();
                },
            });
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

/**
 * Creates a compact execution control button.
 *
 * @param {string} label - Button label
 * @returns {St.Button} Button actor
 */
function createExecutionButton(label) {
    return new St.Button({
        child: new St.Label({text: label}),
        can_focus: true,
        x_expand: true,
        style_class: 'button',
    });
}

/**
 * Enables or disables an execution control button.
 *
 * @param {St.Button} button - Button actor
 * @param {boolean} enabled - Whether the button can be clicked
 */
function setExecutionButtonEnabled(button, enabled) {
    button.reactive = enabled;
    button.can_focus = enabled;
    button.opacity = enabled ? 255 : 96;
}

export default Widget;
