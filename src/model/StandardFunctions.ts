import {FunctionsReferences} from "./FunctionsReferences";

export class StandardFunctions {
    private readonly _id: String;
    private readonly _type: String;
    private readonly _references: FunctionsReferences[];

    constructor(id: String, type: String, references: FunctionsReferences[]) {
        this._id = id;
        this._type = type;
        this._references = references;
    }

    get id(): String {
        return this._id;
    }

    get type(): String {
        return this._type;
    }

    get references(): FunctionsReferences[] {
        return this._references;
    }
}
