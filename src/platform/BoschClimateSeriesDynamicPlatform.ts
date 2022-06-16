import {
    API,
    APIEvent,
    DynamicPlatformPlugin,
    Formats,
    HAP,
    Logging,
    PlatformAccessory,
    PlatformAccessoryEvent,
    PlatformConfig,
    Units,
} from "homebridge";
import {Constants} from "../util/Constants";
import {BoschApi} from "../service/BoschApi";
import {Token} from "../model/Token";
import {DataManager} from "../util/DataManager";
import {ActiveMapper} from "../mapper/ActiveMapper";
import {TargetHeaterCoolerStateMapper} from "../mapper/TargetHeaterCoolerStateMapper";
import {CurrentHeaterCoolerStateMapper} from "../mapper/CurrentHeaterCoolerStateMapper";
import {FanRotationSpeedMapper} from "../mapper/FanRotationSpeedMapper";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger, LoggingLevel} from "../util/CustomLogger";
import {DeviceMapping} from "../model/DeviceMapping";

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

export class BoschClimateSeriesDynamicPlatform implements DynamicPlatformPlugin {

    private readonly log: CustomLogger;
    private readonly api: API;
    private readonly boschApi: BoschApi;
    private readonly jwtToken;
    private readonly refreshToken;
    private readonly deviceNameMapping: Map<string, DeviceMapping>;
    private readonly standardFunctionsService: ApplianceService;

    private readonly accessories: PlatformAccessory[] = [];

    constructor(log: Logging, config: PlatformConfig, api: API) {
        this.setLoggingLevel(config.loggingLevel.level);
        this.log = new CustomLogger(log, 'BoschClimateSeriesDynamicPlatform');
        this.api = api;
        hap = api.hap;
        this.jwtToken = config.jwtToken;
        this.refreshToken = config.refreshToken;
        const token = new Token(this.jwtToken, this.refreshToken);

        this.boschApi = new BoschApi(token, log, api.user.persistPath());
        this.standardFunctionsService = new ApplianceService(this.boschApi, log);

        this.deviceNameMapping = this.buildDeviceNameMapping(config.deviceNameMapping);
        DataManager.refreshIntervalMillis = config.refreshInterval || DataManager.refreshIntervalMillis;
        DataManager.boschApiBearerToken = config.basicAuthToken || DataManager.boschApiBearerToken;

        // probably parse config or something here

        this.log.info("BoschClimateSeriesDynamic platform finished initializing!");

        /*
         * When this event is fired, homebridge restored all cached accessories from disk and did call their respective
         * `configureAccessory` method for all of them. Dynamic Platform plugins should only register new accessories
         * after this event was fired, in order to ensure they weren't added to homebridge already.
         * This event can also be used to start discovery of new accessories.
         */
        api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
            this.log.info("Executed 'didFinishLaunching' callback");

            this.discoverDevices();
        });
    }

    private buildDeviceNameMapping(deviceNameMapping: Array<any>): Map<string, DeviceMapping> {
        return new Map(deviceNameMapping.map(e => [e.gatewayId, e as DeviceMapping]))
    }

    private setLoggingLevel(value: string) {
        if (value && LoggingLevel[value.toUpperCase()]) {
            DataManager.loggingLevel = LoggingLevel[value.toUpperCase()] as number
        } else {
            DataManager.loggingLevel = LoggingLevel.INFO.valueOf()
        }
    }

    /*
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory): void {
        this.log.info("Configuring accessory %s", accessory.context.serialNumber);

        accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
            this.log.info("%s identified!", accessory.context.serialNumber);
        });

        const deviceService = accessory.getService(hap.Service.HeaterCooler)!;
        const informationService = accessory.getService(hap.Service.AccessoryInformation)!;

        deviceService.getCharacteristic(hap.Characteristic.Active)
            .onGet(async () => {
                return this.standardFunctionsService.retrieveDeviceState(accessory.context.serialNumber)
                    .then(value => {
                        if (!value) {
                            this.log.error("Null room temperature was found for device %s", accessory.context.serialNumber);
                            return hap.Characteristic.Active.INACTIVE;
                        }

                        const currentState = value.value.valueOf()
                        this.log.debug("Current state of device %s is %s", accessory.context.serialNumber, currentState);
                        return ActiveMapper.mapToNumber(currentState);
                    })
                    .catch(error => {
                        this.log.error("Failed to get active characteristic for device %s with error %s", accessory.context.serialNumber, JSON.stringify(error));
                        return hap.Characteristic.Active.INACTIVE;
                    })
            })
            .onSet(async (value) => {
                //value is true/false if on/off
                const desiredState = value as boolean ? 'on' : 'off'
                this.standardFunctionsService.changeDeviceState(desiredState, accessory.context.serialNumber)
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
            })
        deviceService.getCharacteristic(hap.Characteristic.TargetHeaterCoolerState)
            .onGet(async () => {
                return this.standardFunctionsService.retrieveCurrentOperationMode(accessory.context.serialNumber)
                    .then(value => {
                        if (!value) {
                            this.log.error("Null room temperature was found for device %s", accessory.context.serialNumber);
                            return hap.Characteristic.TargetHeaterCoolerState.AUTO;
                        }

                        const currentOperationMode = value.value.valueOf()
                        this.log.debug("Current operation mode of device %s is %s", accessory.context.serialNumber, currentOperationMode);
                        return TargetHeaterCoolerStateMapper.mapToNumber(currentOperationMode);
                    })
                    .catch(error => {
                        this.log.error("Cannot set TargetHeatingCoolingState for device %s due to error %s", accessory.context.serialNumber, JSON.stringify(error));
                        return hap.Characteristic.TargetHeaterCoolerState.AUTO;
                    })
            })
            .onSet(async (value) => {
                const desiredOperationModeString = TargetHeaterCoolerStateMapper.mapToString(value as number)
                this.log.debug("Changing TargetHeaterCoolerState for device %s it to %s", accessory.context.serialNumber, desiredOperationModeString)

                this.standardFunctionsService.changeOperationMode(desiredOperationModeString, accessory.context.serialNumber)
                    .then(result => {
                        if (result && result === desiredOperationModeString) {
                            this.log.info("Device %s operation mode was changed to %s", accessory.context.serialNumber, result)
                        } else {
                            this.log.info("Device %s operation mode was not changed to %s", accessory.context.serialNumber, desiredOperationModeString)
                        }
                    })
                    .catch(error => {
                        this.log.error("Error %s found when setting TargetHeaterCoolerState for device %s", JSON.stringify(error), accessory.context.serialNumber);
                    })
            })

        deviceService.getCharacteristic(hap.Characteristic.CurrentHeaterCoolerState)
            .onGet(async () => {
                const temperatureSetPointPromise = this.standardFunctionsService.retrieveTemperatureSetPoint(accessory.context.serialNumber);
                const roomTemperaturePromise = this.standardFunctionsService.retrieveCurrentRoomTemperature(accessory.context.serialNumber);
                const operationModePromise = this.standardFunctionsService.retrieveCurrentOperationMode(accessory.context.serialNumber);

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
                        return hap.Characteristic.CurrentHeaterCoolerState.INACTIVE;
                    })
            })

        deviceService.getCharacteristic(hap.Characteristic.CurrentTemperature)
            .onGet(async () => {
                return this.standardFunctionsService.retrieveCurrentRoomTemperature(accessory.context.serialNumber)
                    .then(value => {
                        if (!value) {
                            this.log.error("Null room temperature was found for device %s", accessory.context.serialNumber);
                            return 0.0
                        }

                        const currentTemperature = value.value.valueOf()
                        this.log.info("Current room temperature for device %s has returned: %s", accessory.context.serialNumber, currentTemperature);
                        return parseFloat(currentTemperature)
                    })
                    .catch(error => {
                        this.log.error("Error %s found when reading current temperate for device %s", JSON.stringify(error), accessory.context.serialNumber);
                        return 0.0
                    })
            })

        deviceService.getCharacteristic(hap.Characteristic.Name)
            .onGet(async () => {
                return accessory.displayName;
            })

        deviceService.getCharacteristic(hap.Characteristic.CoolingThresholdTemperature)
            .setProps({
                format: Formats.FLOAT,
                unit: Units.CELSIUS,
                minValue: 17.0,
                maxValue: 30.0,
                minStep: 1
            })
            .onGet(async () => {
                return this.standardFunctionsService.retrieveTemperatureSetPoint(accessory.context.serialNumber)
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
            })
            .onSet(async (value) => {
                return this.standardFunctionsService.setTemperatureSetPoint(value as number, accessory.context.serialNumber)
                    .then(result => {
                        if (result && result === value) {
                            this.log.debug(`Changed temperature set point to ${result} for device ${accessory.context.serialNumber}`);
                        } else {
                            this.log.info("Device %s temperature set point was not changed to %s", accessory.context.serialNumber, value)
                        }
                    })
                    .catch(error => {
                        this.log.error("Error %s found when setting CoolingThresholdTemperature for device %s", JSON.stringify(error), accessory.context.serialNumber);
                    })
            })

        deviceService.getCharacteristic(hap.Characteristic.HeatingThresholdTemperature)
            .setProps({
                format: Formats.FLOAT,
                unit: Units.CELSIUS,
                minValue: 17.0,
                maxValue: 30.0,
                minStep: 1
            })
            .onGet(async () => {
                return this.standardFunctionsService.retrieveTemperatureSetPoint(accessory.context.serialNumber)
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
            })
            .onSet(async (value) => {
                return this.standardFunctionsService.setTemperatureSetPoint(value as number, accessory.context.serialNumber)
                    .then(result => {
                        if (result && result === value) {
                            this.log.debug("Changed temperature set point to %s for device %s", result, accessory.context.serialNumber);
                        } else {
                            this.log.info("Device %s temperature set point was not changed to %s", accessory.context.serialNumber, value)
                        }
                    })
                    .catch(error => {
                        this.log.error("Error %s found when setting HeatingThresholdTemperature for device %s", JSON.stringify(error), accessory.context.serialNumber);
                    })
            })

        deviceService.getCharacteristic(hap.Characteristic.RotationSpeed)
            .setProps({
                format: Formats.FLOAT,
                unit: Units.PERCENTAGE,
                minValue: 0.0,
                maxValue: 100.0,
                minStep: 25,
                validValues: [0.0, 25.0, 50.0, 75.0, 100.0]
            })
            .onGet(async () => {
                return this.standardFunctionsService.retrieveFanSpeed(accessory.context.serialNumber)
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
            })
            .onSet(async (value) => {
                const valueString = FanRotationSpeedMapper.mapToString(value as number)
                return this.standardFunctionsService.setFanSpeed(valueString as string, accessory.context.serialNumber)
                    .then(result => {
                        if (result && result === valueString) {
                            this.log.debug("Changed fan speed to %s for device %s", result, accessory.context.serialNumber);
                        } else {
                            this.log.info("Device %s fan speed was not changed to %s", accessory.context.serialNumber, value);
                        }
                    })
                    .catch(error => {
                        this.log.error("Error %s found when setting RotationSpeed for device %s", JSON.stringify(error), accessory.context.serialNumber);
                    })
            })

        if (accessory.context.extraTemperatureSensor) {
            const temperatureService = accessory.getService(hap.Service.TemperatureSensor)!;
            temperatureService.getCharacteristic(hap.Characteristic.CurrentTemperature)
                .onGet(async () => {
                    return this.standardFunctionsService.retrieveCurrentRoomTemperature(accessory.context.serialNumber)
                        .then(value => {
                            if (!value) {
                                this.log.error("Null room temperature was found for device %s", accessory.context.serialNumber);
                                return 0.0
                            }

                            const currentTemperature = value.value.valueOf()
                            this.log.info("Current room temperature for device %s has returned: %s", accessory.context.serialNumber, currentTemperature);
                            return parseFloat(currentTemperature)
                        })
                        .catch(error => {
                            this.log.error("Error %s found when reading current temperate for device %s", JSON.stringify(error), accessory.context.serialNumber);
                            return 0.0
                        })
                })
            temperatureService.getCharacteristic(hap.Characteristic.Name)
                .onGet(async () => {
                    return "Temperature sensor";
                })
        }

        informationService
            .setCharacteristic(hap.Characteristic.Manufacturer, "DotInc")
            .setCharacteristic(hap.Characteristic.Model, "BoschClimateSeries")
            .setCharacteristic(hap.Characteristic.SerialNumber, accessory.context.serialNumber)
            .setCharacteristic(hap.Characteristic.Name, accessory.displayName);

        this.accessories.push(accessory);
    }

    private async discoverDevices(): Promise<boolean> {
        return this.boschApi.retrieveAllGateways()
            .then(gateways => {
                this.log.info(`Discovered ${gateways.length || 0} devices. Will filter them to exclude invalid and existing ones!`)
                if (gateways) {
                    const gatewaysId = gateways.map(e => e.deviceId.valueOf());
                    const accessoriesNoLongerExistent = this.accessories.filter(e => !gatewaysId.includes(e.context.serialNumber));
                    this.api.unregisterPlatformAccessories(Constants.PLUGIN_NAME, Constants.PLATFORM_NAME, accessoriesNoLongerExistent)
                    this.log.info(`Removed ${accessoriesNoLongerExistent.length} devices as they were not longer registered with the server!`)
                    this.log.debug(`Removed ${accessoriesNoLongerExistent} devices as they were not longer registered with the server!`)

                    gateways.forEach(gateway => {
                        const generatedUUID = hap.uuid.generate(gateway.deviceId.valueOf());
                        const existingAccessory = this.accessories.find(accessory => accessory.UUID === generatedUUID);

                        if (!existingAccessory) {
                            const device = this.deviceNameMapping?.get(gateway.deviceId.valueOf()) || null;
                            const deviceName = device?.name || gateway.deviceId.valueOf();
                            const accessory = new this.api.platformAccessory(deviceName, generatedUUID);
                            accessory.context.serialNumber = gateway.deviceId.valueOf();
                            accessory.context.extraTemperatureSensor = device?.exposeTemperatureSensor || false;
                            accessory.addService(hap.Service.HeaterCooler, deviceName);
                            if (accessory.context.extraTemperatureSensor) {
                                accessory.addService(hap.Service.TemperatureSensor, deviceName);
                            }
                            this.configureAccessory(accessory);
                            this.log.info(`Registering new accessory ${gateway.deviceId.valueOf()} in platform`)
                            this.api.registerPlatformAccessories(Constants.PLUGIN_NAME, Constants.PLATFORM_NAME, [accessory]);
                        } else {
                            this.log.info(`Updating old accessory ${existingAccessory.context.serialNumber} in platform`)
                            this.api.updatePlatformAccessories([existingAccessory])
                        }
                    });
                    return true;
                }
                return false;
            })
            .catch(error => {
                this.log.error(`Error received when discovering devices ${JSON.stringify(error)}`);
                return false;
            });
    }
}
