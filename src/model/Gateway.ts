export class Gateway {
    private _deviceId: String
    private firmwareVersion: String | undefined
    private hardwareVersion: String | undefined
    private productId: String | undefined
    private brandId: String | undefined
    private serialNumber: String | undefined
    private _deviceType: String

    constructor(deviceId: String, firmwareVersion: String | undefined, hardwareVersion: String | undefined, productId: String | undefined, brandId: String | undefined, serialNumber: String | undefined, deviceType: String) {
        this._deviceId = deviceId;
        this.firmwareVersion = firmwareVersion;
        this.hardwareVersion = hardwareVersion;
        this.productId = productId;
        this.brandId = brandId;
        this.serialNumber = serialNumber;
        this._deviceType = deviceType;
    }


    get deviceId(): String {
        return this._deviceId;
    }
}
