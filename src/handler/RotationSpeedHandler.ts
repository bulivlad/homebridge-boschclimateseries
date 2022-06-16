import {FanRotationSpeedMapper} from "../mapper/FanRotationSpeedMapper";
import {Formats, Logger, PlatformAccessory, Units} from "homebridge";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger} from "../util/CustomLogger";

export class RotationSpeedHandler {
    private readonly applianceService: ApplianceService;
    private readonly log: CustomLogger;


    constructor(applianceService: ApplianceService, log: Logger) {
        this.applianceService = applianceService;
        this.log = new CustomLogger(log, "TargetHeaterCoolerStateHandler");
    }

    public getProps() {
        return {
            format: Formats.FLOAT,
            unit: Units.PERCENTAGE,
            minValue: 0.0,
            maxValue: 100.0,
            minStep: 25,
            validValues: [0.0, 25.0, 50.0, 75.0, 100.0]
        }
    }

    public onGetHandler(accessory: PlatformAccessory) {
        return async () => {
            return this.applianceService.retrieveFanSpeed(accessory.context.serialNumber)
                .then(result => {
                    if (result && result.value) {
                        return FanRotationSpeedMapper.mapToNumber(result.value.valueOf());
                    } else {
                        return 100.0;
                    }
                })
                .catch(error => {
                    this.log.error("Error %s found when reading RotationSpeed for device %s", JSON.stringify(error), accessory.context.serialNumber);
                    return 100.0;
                })
        }
    }

    public onSetHandler(accessory: PlatformAccessory) {
        return async (value) => {
            const valueString = FanRotationSpeedMapper.mapToString(value as number)
            return this.applianceService.setFanSpeed(valueString as string, accessory.context.serialNumber)
                .then(result => {
                    if (result && result === valueString) {
                        this.log.debug("Changed fan speed to %s for device %s", result, accessory.context.serialNumber);
                    } else {
                        this.log.warn("Device %s fan speed was not changed to %s", accessory.context.serialNumber, value);
                    }
                })
                .catch(error => {
                    this.log.error("Error %s found when setting RotationSpeed for device %s", JSON.stringify(error), accessory.context.serialNumber);
                })
        }
    }
}
