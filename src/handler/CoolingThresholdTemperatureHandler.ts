import {Formats, Logger, PlatformAccessory, Units} from "homebridge";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger} from "../util/CustomLogger";

export class CoolingThresholdTemperatureHandler {
    private readonly applianceService: ApplianceService;
    private readonly log: CustomLogger;


    constructor(applianceService: ApplianceService, log: Logger) {
        this.applianceService = applianceService;
        this.log = new CustomLogger(log, "CoolingThresholdTemperatureHandler");
    }

    public getProps() {
        return {
            format: Formats.FLOAT,
            unit: Units.CELSIUS,
            minValue: 17.0,
            maxValue: 30.0,
            minStep: 1
        }
    }

    public onGetHandler(accessory: PlatformAccessory) {
        return async () => {
            return this.applianceService.retrieveTemperatureSetPoint(accessory.context.serialNumber)
                .then(result => {
                    if (result && result.value) {
                        return parseFloat(result.value.valueOf());
                    } else {
                        return null;
                    }
                })
                .catch(error => {
                    this.log.error("Error %s found when reading CoolingThresholdTemperature for device %s", JSON.stringify(error), accessory.context.serialNumber);
                    return 0.0
                })
        }
    }

    public onSetHandler(accessory: PlatformAccessory) {
        return async (value) => {
            return this.applianceService.setTemperatureSetPoint(value as number, accessory.context.serialNumber)
                .then(result => {
                    if (result && result === value) {
                        this.log.debug(`Changed temperature set point to ${result} for device ${accessory.context.serialNumber}`);
                    } else {
                        this.log.debug("Device %s temperature set point was not changed to %s", accessory.context.serialNumber, value)
                    }
                })
                .catch(error => {
                    this.log.error("Error %s found when setting CoolingThresholdTemperature for device %s", JSON.stringify(error), accessory.context.serialNumber);
                })
        }
    }
}
