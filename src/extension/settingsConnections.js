export default class SettingsConnections {
    constructor(settings) {
        this._settings = settings;
        this._signalIds = [];
    }

    connect(key, handler) {
        const signalId = this._settings.connect(`changed::${key}`, handler);
        this._signalIds.push(signalId);
        return signalId;
    }

    connectMany(entries) {
        for (const [key, handler] of entries)
            this.connect(key, handler);
    }

    disconnectAll() {
        for (const signalId of this._signalIds)
            this._settings.disconnect(signalId);

        this._signalIds = [];
    }
}
