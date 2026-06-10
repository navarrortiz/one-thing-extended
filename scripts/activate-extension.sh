#!/usr/bin/env bash
set -euo pipefail

UUID="one-thing-extended@navarrortiz.github.io"

if gnome-extensions info "$UUID" >/dev/null 2>&1; then
    gnome-extensions enable "$UUID"
    echo "Activated $UUID"
    exit 0
fi

enabled="$(gsettings get org.gnome.shell enabled-extensions)"

if [[ "$enabled" != *"'$UUID'"* && "$enabled" != *"\"$UUID\""* ]]; then
    if [[ "$enabled" == "@as []" || "$enabled" == "[]" ]]; then
        enabled="['$UUID']"
    else
        enabled="${enabled%]}, '$UUID']"
    fi

    gsettings set org.gnome.shell enabled-extensions "$enabled"
fi

cat <<EOF
GNOME Shell does not know $UUID in the current session yet.
The extension is installed and has been added to enabled-extensions.
Log out and log back in, then run:

  npm run activate

EOF
