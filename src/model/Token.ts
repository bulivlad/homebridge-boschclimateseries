export class Token {
    private _access_token: String
    private _refresh_token: String

    constructor(access_token: String, refresh_token: String) {
        this._access_token = access_token;
        this._refresh_token = refresh_token;
    }


    get access_token(): String {
        return this._access_token;
    }

    get refresh_token(): String {
        return this._refresh_token;
    }
}
