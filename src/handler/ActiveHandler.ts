import {HAP, Logger, PlatformAccessory} from "homebridge";
import {ActiveMapper} from "../mapper/ActiveMapper";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger} from "../util/CustomLogger";

export class ActiveHandler {
    private readonly applianceService: ApplianceService;
    private readonly log: CustomLogger;
    private readonly hap: HAP;


    constructor(hap: HAP, applianceService: ApplianceService, log: Logger) {
        this.hap = hap;
        this.applianceService = applianceService;
        this.log = new CustomLogger(log, "ActiveHandler");
    }

    public onGetHandler(accessory: PlatformAccessory) {
        return async () => {
            return this.applianceService.retrieveDeviceState(accessory.context.serialNumber)
                .then(value => {
                    if (!value) {
                        this.log.error("Null room temperature was found for device %s", accessory.context.serialNumber);
                        return this.hap.Characteristic.Active.INACTIVE;
                    }

                    const currentState = value.value.valueOf()
                    this.log.debug("Current state of device %s is %s", accessory.context.serialNumber, currentState);
                    return ActiveMapper.mapToNumber(currentState);
                })
                .catch(error => {
                    this.log.error("Failed to get active characteristic for device %s with error %s", accessory.context.serialNumber, JSON.stringify(error));
                    return this.hap.Characteristic.Active.INACTIVE;
                })
        }
    }

    public onSetHandler(accessory: PlatformAccessory) {
        return async (value) => {
            //value is true/false if on/off
            const desiredState = value as boolean ? 'on' : 'off'
            this.applianceService.changeDeviceState(desiredState, accessory.context.serialNumber)
                .then(result => {
                    if (result === desiredState) {
                        this.log.debug("Device %s state was changed to: %s", accessory.context.serialNumber, desiredState);
                    } else {
                        this.log.debug("Device %s state was NOT changed to: %s", accessory.context.serialNumber, desiredState);
                    }
                })
                .catch(error => {
                    this.log.error("Failed to change device %s state to %s with error %s", accessory.context.serialNumber, desiredState, JSON.stringify(error))
                })
        }
    }
}
