import {Logger, PlatformAccessory} from "homebridge";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger} from "../util/CustomLogger";

export class CurrentTemperatureHandler {
    private readonly applianceService: ApplianceService;
    private readonly log: CustomLogger;

    constructor(applianceService: ApplianceService, log: Logger) {
        this.applianceService = applianceService;
        this.log = new CustomLogger(log, "CurrentTemperatureHandler")
    }

    public onGetHandler(accessory: PlatformAccessory) {
        return async () => {
            return this.applianceService.retrieveCurrentRoomTemperature(accessory.context.serialNumber)
                .then(value => {
                    if (!value) {
                        this.log.error("Null room temperature was found for device %s with name %s", accessory.context.serialNumber, accessory.displayName);
                        return 0.0
                    }

                    const currentTemperature = value.value.valueOf()
                    this.log.debug("Current room temperature for device %s with name %s has returned: %s", accessory.context.serialNumber, accessory.displayName, currentTemperature);
                    return parseFloat(currentTemperature)
                })
                .catch(error => {
                    this.log.error("Error %s found when reading current temperate for device %s with name %s", JSON.stringify(error), accessory.context.serialNumber, accessory.displayName);
                    return 0.0
                })
        };
    }
}
