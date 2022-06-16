import {HAP, Logger, PlatformAccessory} from "homebridge";
import {CurrentHeaterCoolerStateMapper} from "../mapper/CurrentHeaterCoolerStateMapper";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger} from "../util/CustomLogger";

export class CurrentHeaterCoolerStateHandler {
    private readonly applianceService: ApplianceService;
    private readonly log: CustomLogger;
    private readonly hap: HAP;


    constructor(hap: HAP, applianceService: ApplianceService, log: Logger) {
        this.hap = hap;
        this.applianceService = applianceService;
        this.log = new CustomLogger(log, "CurrentHeaterCoolerStateHandler");
    }

    public onGetHandler(accessory: PlatformAccessory) {
        return async () => {
            const temperatureSetPointPromise = this.applianceService.retrieveTemperatureSetPoint(accessory.context.serialNumber);
            const roomTemperaturePromise = this.applianceService.retrieveCurrentRoomTemperature(accessory.context.serialNumber);
            const operationModePromise = this.applianceService.retrieveCurrentOperationMode(accessory.context.serialNumber);

            return Promise.all([temperatureSetPointPromise, roomTemperaturePromise, operationModePromise])
                .then(results => {
                    const temperatureSetPoint = results[0];
                    const roomTemperature = results[1];
                    const operationMode = results[2];

                    if (temperatureSetPoint && temperatureSetPoint.value && roomTemperature && roomTemperature.value && operationMode && operationMode.value) {
                        const temperatureSetPointValue = parseFloat(temperatureSetPoint.value.valueOf())
                        const roomTemperatureValue = parseFloat(roomTemperature.value.valueOf())
                        return CurrentHeaterCoolerStateMapper.mapToNumber(roomTemperatureValue, temperatureSetPointValue, operationMode.value.valueOf())
                    } else {
                        throw results
                    }
                })
                .catch(error => {
                    this.log.error("Encountered error %s when reading CurrentHeaterCoolerState for device %s. Returning INACTIVE state", JSON.stringify(error), accessory.context.serialNumber)
                    return this.hap.Characteristic.CurrentHeaterCoolerState.INACTIVE;
                })
        }
    }
}
