import {Gateway} from "../model/Gateway";
import {Constants} from "../util/Constants";
import {API, HAP, Logger, PlatformAccessory} from "homebridge";
import {CustomLogger} from "../util/CustomLogger";
import {DeviceMapping} from "../model/DeviceMapping";

export class PlatformService {
    private readonly api: API;
    private readonly hap: HAP;
    private readonly log: CustomLogger;


    constructor(api: API, log: Logger) {
        this.api = api;
        this.hap = api.hap;
        this.log = new CustomLogger(log, "PlatformService");
    }

    public unregisterUnavailableAccessories(gateways: Gateway[], accessories: PlatformAccessory[]) {
        const gatewaysId = gateways.map(e => e.deviceId.valueOf());
        const accessoriesNoLongerExistent = accessories.filter(e => !gatewaysId.includes(e.context.serialNumber));
        this.api.unregisterPlatformAccessories(Constants.PLUGIN_NAME, Constants.PLATFORM_NAME, accessoriesNoLongerExistent)
        this.log.info(`Removed ${accessoriesNoLongerExistent.length} devices as they were not longer registered with the server!`)
        this.log.debug(`Removed ${accessoriesNoLongerExistent} devices as they were not longer registered with the server!`)
    }

    public createNewAccessory(device: DeviceMapping | null, gateway: Gateway, generatedUUID: string): PlatformAccessory {
        const deviceName = device?.name || gateway.deviceId.valueOf();
        const accessory = new this.api.platformAccessory(deviceName, generatedUUID);
        accessory.context.serialNumber = gateway.deviceId.valueOf();
        accessory.context.extraTemperatureSensor = device?.exposeTemperatureSensor || false;
        accessory.addService(this.hap.Service.HeaterCooler, deviceName);
        if (accessory.context.extraTemperatureSensor) {
            this.log.trace("Adding temperature sensor service for device %s - %s", gateway.deviceId.valueOf(), deviceName);
            accessory.addService(this.hap.Service.TemperatureSensor, deviceName);
        }

        return accessory;
    }
}
