import {TargetHeaterCoolerStateMapper} from "../mapper/TargetHeaterCoolerStateMapper";
import {HAP, Logger, PlatformAccessory} from "homebridge";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger} from "../util/CustomLogger";

export class TargetHeaterCoolerStateHandler {
    private readonly applianceService: ApplianceService;
    private readonly log: CustomLogger;
    private readonly hap: HAP;


    constructor(hap: HAP, applianceService: ApplianceService, log: Logger) {
        this.hap = hap;
        this.applianceService = applianceService;
        this.log = new CustomLogger(log, "TargetHeaterCoolerStateHandler");
    }

    public onGetHandler(accessory: PlatformAccessory) {
        return async () => {
            return this.applianceService.retrieveCurrentOperationMode(accessory.context.serialNumber)
                .then(value => {
                    if (!value) {
                        this.log.error("Null room temperature was found for device %s", accessory.context.serialNumber);
                        return this.hap.Characteristic.TargetHeaterCoolerState.AUTO;
                    }

                    const currentOperationMode = value.value.valueOf()
                    this.log.debug("Current operation mode of device %s is %s", accessory.context.serialNumber, currentOperationMode);
                    return TargetHeaterCoolerStateMapper.mapToNumber(currentOperationMode);
                })
                .catch(error => {
                    this.log.error("Cannot set TargetHeatingCoolingState for device %s due to error %s", accessory.context.serialNumber, JSON.stringify(error));
                    return this.hap.Characteristic.TargetHeaterCoolerState.AUTO;
                })
        }
    }

    public onSetHandler(accessory: PlatformAccessory) {
        return async (value) => {
            const desiredOperationModeString = TargetHeaterCoolerStateMapper.mapToString(value as number)
            this.log.debug("Changing TargetHeaterCoolerState for device %s it to %s", accessory.context.serialNumber, desiredOperationModeString)

            this.applianceService.changeOperationMode(desiredOperationModeString, accessory.context.serialNumber)
                .then(result => {
                    if (result && result === desiredOperationModeString) {
                        this.log.debug("Device %s operation mode was changed to %s", accessory.context.serialNumber, result)
                    } else {
                        this.log.warn("Device %s operation mode was not changed to %s", accessory.context.serialNumber, desiredOperationModeString)
                    }
                })
                .catch(error => {
                    this.log.error("Error %s found when setting TargetHeaterCoolerState for device %s", JSON.stringify(error), accessory.context.serialNumber);
                })
        }
    }
}
