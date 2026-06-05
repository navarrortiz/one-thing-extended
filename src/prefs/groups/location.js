import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {SETTINGS_KEYS} from '../../shared/constants.js';

const BindFlags = Gio.SettingsBindFlags.DEFAULT;

/**
 * @param {object} settings - Extension settings
 */
export function createLocationGroup(settings) {
    const group = new Adw.PreferencesGroup({
        title: 'Location',
    });

    const indexRow = new Adw.SpinRow({
        title: 'Index in Panel',
        adjustment: new Gtk.Adjustment({
            lower: -1,
            upper: 5,
            value: 0,
            'page-increment': 1,
            'step-increment': 1,
        }),
    });
    settings.bind(SETTINGS_KEYS.statusBarIndex, indexRow, 'value', BindFlags);
    group.add(indexRow);

    const selector = createLocationSelector(settings);
    const locationRow = new Adw.ActionRow({
        title: 'Location in Panel',
    });

    locationRow.add_suffix(selector.box);
    group.add(locationRow);

    return group;
}

/**
 * @param {object} settings - Extension settings
 */
function createLocationSelector(settings) {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        valign: Gtk.Align.CENTER,
    });
    box.add_css_class('linked');

    const leftButton = new Gtk.ToggleButton({
        label: 'Left',
    });
    const centerButton = new Gtk.ToggleButton({
        label: 'Center',
        group: leftButton,
    });
    const rightButton = new Gtk.ToggleButton({
        label: 'Right',
        group: leftButton,
    });

    box.append(leftButton);
    box.append(centerButton);
    box.append(rightButton);

    switch (settings.get_int(SETTINGS_KEYS.statusBarLocation)) {
    case 0:
        leftButton.set_active(true);
        break;
    case 1:
        centerButton.set_active(true);
        break;
    case 2:
        rightButton.set_active(true);
        break;
    }

    const locationChanged = () => {
        if (leftButton.get_active())
            settings.set_int(SETTINGS_KEYS.statusBarLocation, 0);
        else if (centerButton.get_active())
            settings.set_int(SETTINGS_KEYS.statusBarLocation, 1);
        else if (rightButton.get_active())
            settings.set_int(SETTINGS_KEYS.statusBarLocation, 2);
    };

    leftButton.connect('notify::active', locationChanged);
    centerButton.connect('notify::active', locationChanged);
    rightButton.connect('notify::active', locationChanged);

    return {box};
}
