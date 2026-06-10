// this is a customized version of the GNOME shell source file shellEntry.js:
// copy copies all if there is no selection; this is useful behavior for the
// calculator but also works around odd behavior in St.Entry where it clears the
// selection on button-press-event, thus indicating nothing to copy. (normal
// behavior is to clear the selection on button down event.) also, password
// stuff and CapsLockWarning were removed

import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Params from 'resource:///org/gnome/shell/misc/params.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {BoxPointer} from 'resource:///org/gnome/shell/ui/boxpointer.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import {addChild} from './compat.js';

export class EntryMenu extends PopupMenu.PopupMenu {
    constructor(entry, onPreferencesOpen) {
        super(entry, 0, St.Side.TOP);

        this._entry = entry;
        this._onPreferencesOpen = onPreferencesOpen;

        let item;

        item = new PopupMenu.PopupMenuItem(_('Copy'));
        item.connect('activate', this._onCopyActivated.bind(this));
        this.addMenuItem(item);
        this._copyItem = item;

        item = new PopupMenu.PopupMenuItem(_('Paste'));
        item.connect('activate', this._onPasteActivated.bind(this));
        this.addMenuItem(item);
        this._pasteItem = item;

        item = new PopupMenu.PopupMenuItem(_('Preferences'));
        item.connect('activate', () => {
            this._onPreferencesOpen();
            entry.menu.close();
        });
        this.addMenuItem(item);

        addChild(Main.uiGroup, this.actor);
        this.actor.hide();
    }

    open(animate) {
        this._updatePasteItem();
        this._updateCopyItem();

        super.open(animate);
        this._entry.add_style_pseudo_class('focus');

        const direction = St.DirectionType.TAB_FORWARD;
        if (!this.actor.navigate_focus(null, direction, false))
            this.actor.grab_key_focus();
    }

    _updateCopyItem() {
        this._copyItem.setSensitive(this._entry.clutter_text.get_text().length !== 0);
    }

    _updatePasteItem() {
        this._pasteItem.setSensitive(true);
    }

    _onCopyActivated() {
        if (this._entry.clutter_text.get_selection().length === 0)
            this._entry.clutter_text.set_selection(-1, 0);

        this._entry.clutter_text.copy_clipboard();
    }

    _onPasteActivated() {
        this._entry.clutter_text.delete_selection();
        this._entry.clutter_text.paste_clipboard();
    }
}

/**
 * @param {object} entry - The St.Entry actor
 * @param {number} stageX - The X coordinate in stage space
 */
function setMenuAlignment(entry, stageX) {
    const [success, entryX] = entry.transform_stage_point(stageX, 0);
    if (success)
        entry.menu.setSourceAlignment(entryX / entry.width);
}

/**
 * @param {object} _actor - The actor that received the event
 * @param {object} event - The Clutter button press event
 * @param {object} entry - The St.Entry actor
 */
function onButtonPressEvent(_actor, event, entry) {
    if (entry.menu.isOpen) {
        entry.menu.close(BoxPointer.PopupAnimation.FULL);
        return Clutter.EVENT_STOP;
    }

    if (event.get_button() === 3) {
        const [stageX] = event.get_coords();
        setMenuAlignment(entry, stageX);
        entry.menu.open(BoxPointer.PopupAnimation.FULL);
        return Clutter.EVENT_STOP;
    }

    return Clutter.EVENT_PROPAGATE;
}

/**
 * @param {object} _actor - The actor that received the event
 * @param {object} entry - The St.Entry actor
 */
function onPopup(_actor, entry) {
    const cursorPosition = entry.clutter_text.get_cursor_position();
    const [success, textX] = entry.clutter_text.position_to_coords(cursorPosition);

    if (success)
        entry.menu.setSourceAlignment(textX / entry.width);

    entry.menu.open(BoxPointer.PopupAnimation.FULL);
}

/**
 * @param {object} entry - The St.Entry or St.Label actor
 * @param {object} params - Optional parameters including actionMode
 * @param {Function} [onPreferencesOpen] - Callback when preferences item is activated
 */
export function addContextMenu(entry, params, onPreferencesOpen = () => {}) {
    if (entry.menu)
        return;

    params = Params.parse(params, {actionMode: Shell.ActionMode.POPUP});

    entry.menu = new EntryMenu(entry, onPreferencesOpen);
    entry._menuManager = new PopupMenu.PopupMenuManager(entry, {
        actionMode: params.actionMode,
    });
    entry._menuManager.addMenu(entry.menu);

    entry.clutter_text.connect('button-press-event', (actor, event) => {
        onButtonPressEvent(actor, event, entry);
    });
    entry.connect('button-press-event', (actor, event) => {
        onButtonPressEvent(actor, event, entry);
    });
    entry.connect('popup-menu', actor => onPopup(actor, entry));

    entry.connect('destroy', () => {
        entry.menu.destroy();
        entry.menu = null;
        entry._menuManager = null;
    });
}

/**
 * @param {object} entry - The St.Entry or St.Label actor
 * @param {object} params - Optional parameters including actionMode
 */
function _addContextMenu(entry, params) {
    addContextMenu(entry, params);
}

export {_addContextMenu};
