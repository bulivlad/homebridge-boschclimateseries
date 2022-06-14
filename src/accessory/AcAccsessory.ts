import {AccessoryPlugin, Formats, HAP, Logging, Service, Units} from "homebridge";
import {BoschApi} from "../service/BoschApi";
import {TargetHeaterCoolerStateMapper} from "../mapper/TargetHeaterCoolerStateMapper";
import {ActiveMapper} from "../mapper/ActiveMapper";
import {ApplianceService} from "../service/ApplianceService";
import {CurrentHeaterCoolerStateMapper} from "../mapper/CurrentHeaterCoolerStateMapper";
import {FanRotationSpeedMapper} from "../mapper/FanRotationSpeedMapper";
import {CustomLogger, LoggingLevel} from "../util/CustomLogger";

export class AcAccsessory implements AccessoryPlugin {

    private readonly log: CustomLogger;
    private readonly api: BoschApi;
    private readonly hap: HAP;
    private readonly standardFunctionsService: ApplianceService;

    // This property must be existent!!
    name: string;
    serialNumber: string;

    private readonly deviceService: Service;
    private readonly informationService: Service;

    constructor(hap: HAP, log: Logging, api: BoschApi, name: string, serialNumber: string) {
        this.log = new CustomLogger(log, 'AcAccsessory');
        this.api = api;
        this.name = name;
        this.serialNumber = serialNumber;
        this.hap = hap;
        this.standardFunctionsService = new ApplianceService(this.api, log);

        this.deviceService = new hap.Service.HeaterCooler(name);
        this.deviceService.getCharacteristic(hap.Characteristic.Active)
            .onGet(async () => {
                return this.standardFunctionsService.retrieveDeviceState(this.serialNumber)
                    .then(value => {
                    if (!value) {
                        this.log.error("Null room temperature was found");
                        return hap.Characteristic.Active.INACTIVE;
                    }

                    const currentState = value.value.valueOf()
                    this.log.debug(`Current state of device ${this.serialNumber} is ${currentState}`);
                    return ActiveMapper.mapToNumber(currentState);
                })
                    .catch(value => {
                        this.log.error(value)
                        return hap.Characteristic.Active.INACTIVE;
                    })
            })
            .onSet(async (value) => {
                //value is true/false if on/off
                const desiredState = value as boolean ? 'on' : 'off'
                this.standardFunctionsService.changeDeviceState(desiredState, this.serialNumber)
                    .then(result => {
                        if (result === desiredState) {
                            this.log.debug(`Device ${this.serialNumber} state was changed to: ${desiredState}`);
                        } else {
                            this.log.debug(`Device ${this.serialNumber} state was NOT changed to: ${desiredState}`);
                        }
                    })
                    .catch(error => {
                        this.log.error(`Failed to change device ${this.serialNumber} state to ${desiredState} with error ${error}`)
                    })
            })
        this.deviceService.getCharacteristic(this.hap.Characteristic.TargetHeaterCoolerState)
            .onGet(async () => {
                return this.standardFunctionsService.retrieveCurrentOperationMode(this.serialNumber)
                    .then(value => {
                    if (!value) {
                        this.log.error("Null operation mode was found");
                        return hap.Characteristic.TargetHeaterCoolerState.AUTO;
                    }

                    const currentOperationMode = value.value.valueOf()
                    this.log.debug(`Current operation mode of device ${this.serialNumber} is ${currentOperationMode}`);
                    return TargetHeaterCoolerStateMapper.mapToNumber(currentOperationMode);
                })
                    .catch(error => {
                        this.log.error(`Cannot set TargetHeatingCoolingState due to error ${JSON.stringify(error)}`);
                        return hap.Characteristic.TargetHeaterCoolerState.AUTO;
                    })
            })
            .onSet(async (value) => {
                this.log.debug(`Changing TargetHeaterCoolerState it to raw ${value}`)
                const desiredOperationModeString = TargetHeaterCoolerStateMapper.mapToString(value as number)
                this.log.debug(`Changing TargetHeaterCoolerState it to ${desiredOperationModeString}`)

                this.standardFunctionsService.changeOperationMode(desiredOperationModeString, this.serialNumber)
                    .then(result => {
                        if (result && result === desiredOperationModeString) {
                            this.log.info(`Device operation mode was changed to ${result}`)
                        } else {
                            this.log.info(`Device operation mode was not changed to ${desiredOperationModeString}`)
                        }
                    })
                    .catch(error => {
                        this.log.error(error)
                    })
            })

        this.deviceService.getCharacteristic(hap.Characteristic.CurrentHeaterCoolerState)
            .onGet(async () => {
                const temperatureSetPointPromise = this.standardFunctionsService.retrieveTemperatureSetPoint(this.serialNumber);
                const roomTemperaturePromise = this.standardFunctionsService.retrieveCurrentRoomTemperature(this.serialNumber);
                const operationModePromise = this.standardFunctionsService.retrieveCurrentOperationMode(this.serialNumber);

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
                        this.log.error(`Encountered error with body ${JSON.stringify(error)} when reading CurrentHeaterCoolerState. Returning INACTIVE state`)
                        return this.hap.Characteristic.CurrentHeaterCoolerState.INACTIVE;
                    })
            })

        this.deviceService.getCharacteristic(hap.Characteristic.CurrentTemperature)
            .onGet(async () => {
                return this.standardFunctionsService.retrieveCurrentRoomTemperature(this.serialNumber)
                    .then(value => {
                        if (!value) {
                            this.log.error("Null room temperature was found");
                            return 0.0
                        }

                        const currentTemperature = value.value.valueOf()
                        log.info("Current room temperature for sensor has returned: " + currentTemperature);
                        return parseFloat(currentTemperature)
                    })
                    .catch(value => {
                        this.log.error(value);
                        return 0.0
                    })
            })

        this.deviceService.getCharacteristic(hap.Characteristic.Name)
            .onGet(async () => {
                return this.name;
            })

        this.deviceService.getCharacteristic(hap.Characteristic.CoolingThresholdTemperature)
            .setProps({
                format: Formats.FLOAT,
                unit: Units.CELSIUS,
                minValue: 17.0,
                maxValue: 30.0,
                minStep: 1
            })
            .onGet(async () => {
                return this.standardFunctionsService.retrieveTemperatureSetPoint(this.serialNumber)
                    .then(result => {
                        if (result && result.value) {
                            return parseFloat(result.value.valueOf());
                        } else {
                            return null;
                        }
                    })
            })
            .onSet(async (value) => {
                return this.standardFunctionsService.setTemperatureSetPoint(value as number, this.serialNumber)
                    .then(result => {
                        if (result && result === value) {
                            this.log.debug(`Changed temperature set point to ${result} for device ${this.serialNumber}`);
                        } else {
                            this.log.info(`Device temperature set point was not changed to ${value}`)
                        }
                    })
                    .catch(error => {
                        this.log.error(error)
                    })
            })

        this.deviceService.getCharacteristic(hap.Characteristic.HeatingThresholdTemperature)
            .setProps({
                format: Formats.FLOAT,
                unit: Units.CELSIUS,
                minValue: 17.0,
                maxValue: 30.0,
                minStep: 1
            })
            .onGet(async () => {
                return this.standardFunctionsService.retrieveTemperatureSetPoint(this.serialNumber)
                    .then(result => {
                        if (result && result.value) {
                            return parseFloat(result.value.valueOf());
                        } else {
                            return null;
                        }
                    })
            })
            .onSet(async (value) => {
                return this.standardFunctionsService.setTemperatureSetPoint(value as number, this.serialNumber)
                    .then(result => {
                        if (result && result === value) {
                            this.log.debug(`Changed temperature set point to ${result} for device ${this.serialNumber}`);
                        } else {
                            this.log.info(`Device temperature set point was not changed to ${value}`)
                        }
                    })
                    .catch(error => {
                        this.log.error(error)
                    })
            })

        this.deviceService.getCharacteristic(hap.Characteristic.RotationSpeed)
            .setProps({
                format: Formats.FLOAT,
                unit: Units.PERCENTAGE,
                minValue: 0.0,
                maxValue: 100.0,
                minStep: 25,
                validValues: [0.0, 25.0, 50.0, 75.0, 100.0]
            })
            .onGet(async () => {
                return this.standardFunctionsService.retrieveFanSpeed(this.serialNumber)
                    .then(result => {
                        if (result && result.value) {
                            return FanRotationSpeedMapper.mapToNumber(result.value.valueOf());
                        } else {
                            return 100.0;
                        }
                    })
                    .catch(error => {
                        this.log.error(error)
                        return 100.0;
                    })
            })
            .onSet(async (value) => {
                const valueString = FanRotationSpeedMapper.mapToString(value as number)
                return this.standardFunctionsService.setFanSpeed(valueString as string, this.serialNumber)
                    .then(result => {
                        if (result && result === valueString) {
                            this.log.debug(`Changed fan speed to ${result} for device ${this.serialNumber}`);
                        } else {
                            this.log.info(`Device fan speed was not changed to ${value}`)
                        }
                    })
                    .catch(error => {
                        this.log.error(error)
                    })
            })

        this.informationService = new hap.Service.AccessoryInformation()
            .setCharacteristic(hap.Characteristic.Manufacturer, "DotInc")
            .setCharacteristic(hap.Characteristic.Model, "BoschClimateSeries")
            .setCharacteristic(hap.Characteristic.SerialNumber, this.serialNumber)
            .setCharacteristic(hap.Characteristic.Name, this.name);

        log.info("Bosch Climate device '%s' created!", name);
    }

    /*
     * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
     * Typical this only ever happens at the pairing process.
     */
    identify(): void {
        this.log.trace("Identify!");
    }

    /*
     * This method is called directly after creation of this instance.
     * It should return all services which should be added to the accessory.
     */
    getServices(): Service[] {
        return [
            this.informationService,
            this.deviceService
        ];
    }

}
