export class FunctionsReferences {
    private _id: String;
    private _type: String;
    private _value: String;


    constructor(id: String, type: String, value: String) {
        this._id = id;
        this._type = type;
        this._value = value;
    }


    get id(): String {
        return this._id;
    }

    get type(): String {
        return this._type;
    }

    get value(): String {
        return this._value;
    }
}
