import {Formats, Logger, PlatformAccessory, Units} from "homebridge";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger} from "../util/CustomLogger";

export class HeatingThresholdTemperatureHandler {
    private readonly applianceService: ApplianceService;
    private readonly log: CustomLogger;


    constructor(applianceService: ApplianceService, log: Logger) {
        this.applianceService = applianceService;
        this.log = new CustomLogger(log, "TargetHeaterCoolerStateHandler");
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
                    this.log.error("Error %s found when reading HeatingThresholdTemperature for device %s", JSON.stringify(error), accessory.context.serialNumber);
                    return null;
                })
        }
    }

    public onSetHandler(accessory: PlatformAccessory) {
        return async (value) => {
            return this.applianceService.setTemperatureSetPoint(value as number, accessory.context.serialNumber)
                .then(result => {
                    if (result && result === value) {
                        this.log.debug("Changed temperature set point to %s for device %s", result, accessory.context.serialNumber);
                    } else {
                        this.log.warn("Device %s temperature set point was not changed to %s", accessory.context.serialNumber, value)
                    }
                })
                .catch(error => {
                    this.log.error("Error %s found when setting HeatingThresholdTemperature for device %s", JSON.stringify(error), accessory.context.serialNumber);
                })
        }
    }
}
