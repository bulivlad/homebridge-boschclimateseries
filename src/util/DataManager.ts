export class DataManager {
    private static _refreshIntervalMillis: number = 60000;
    private static _boschApiBearerToken: string = '';
    private static _loggingLevel: number = 3;

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

    static get loggingLevel(): number {
        return this._loggingLevel;
    }

    static set loggingLevel(value: number) {
        this._loggingLevel = value
    }
}
