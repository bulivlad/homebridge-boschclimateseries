export class DeviceMapping {
    private _gatewayID: string;
    private _name: string;
    private _exposeTemperatureSensor: boolean;


    constructor(gatewayID: string, name: string, exposeTemperatureSensor: boolean) {
        this._gatewayID = gatewayID;
        this._name = name;
        this._exposeTemperatureSensor = exposeTemperatureSensor;
    }


    get gatewayID(): string {
        return this._gatewayID;
    }

    set gatewayID(value: string) {
        this._gatewayID = value;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get exposeTemperatureSensor(): boolean {
        return this._exposeTemperatureSensor;
    }

    set exposeTemperatureSensor(value: boolean) {
        this._exposeTemperatureSensor = value;
    }
}
