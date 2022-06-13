export class DataManager {
    private static _refreshIntervalMillis: number = 60000;
    private static _boschApiBearerToken: string = '';

    static get refreshIntervalMillis(): number {
        return this._refreshIntervalMillis;
    }

    static set refreshIntervalMillis(value: number) {
        this._refreshIntervalMillis = value;
    }


    static get boschApiBearerToken(): string {
        return this._boschApiBearerToken;
    }

    static set boschApiBearerToken(value: string) {
        this._boschApiBearerToken = value;
    }
}
