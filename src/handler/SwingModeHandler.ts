import {HAP, Logger, PlatformAccessory} from "homebridge";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger} from "../util/CustomLogger";
import {SwingModeMapper} from "../mapper/SwingModeMapper";

export class SwingModeHandler {
    private readonly hap: HAP;
    private readonly applianceService: ApplianceService;
    private readonly log: CustomLogger;

    constructor(hap: HAP, applianceService: ApplianceService, log: Logger) {
        this.hap = hap;
        this.applianceService = applianceService;
        this.log = new CustomLogger(log, "SwingModeHandler");
    }

    public onGetHandler(accessory: PlatformAccessory) {
        return async () => {
            return Promise.all([this.applianceService.retrieveAirFlowVertical(accessory.context.serialNumber), this.applianceService.retrieveAirFlowHorizontal(accessory.context.serialNumber)])
                .then(result => {
                    const vertical = result[0];
                    const horizontal = result[1];

                    if (vertical && horizontal && vertical.value && horizontal.value) {
                        if (SwingModeMapper.mapToBoolean(vertical.value as string) || SwingModeMapper.mapToBoolean(horizontal.value as string)) {
                            return this.hap.Characteristic.SwingMode.SWING_ENABLED;
                        } else {
                            return this.hap.Characteristic.SwingMode.SWING_DISABLED;
                        }
                    } else {
                        return this.hap.Characteristic.SwingMode.SWING_DISABLED;
                    }
                })
                .catch(error => {
                    this.log.error(`Encountered error with body ${JSON.stringify(error)} when reading SwingMode. Returning SWING_DISABLED state`);
                    return this.hap.Characteristic.SwingMode.SWING_DISABLED;
                })
        }
    }

    public onSetHandler(accessory: PlatformAccessory) {
        return async (value) => {
            const stringValue = SwingModeMapper.mapToString(value);
            Promise.all([
                this.applianceService.setAirFlowVertical(stringValue, accessory.context.serialNumber),
                new Promise(resolve => setTimeout(resolve, 1000)).then(() => {return this.applianceService.setAirFlowHorizontal(stringValue, accessory.context.serialNumber)})])
                .then(result => {
                    if (result[0] && result[1] && (result[0] === stringValue || result[1] === stringValue)) {
                        this.log.debug("Changed swing mode to %s for device %s", result, accessory.context.serialNumber);
                    } else {
                        this.log.warn("Device %s swing mode was not changed to %s with response %s", accessory.context.serialNumber, stringValue, JSON.stringify(result));
                    }
                })
                .catch(error => {
                    this.log.error("Error %s found when setting SwingMode for device %s", JSON.stringify(error), accessory.context.serialNumber);
                })
        }
    }
}
