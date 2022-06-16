import {
    API,
    APIEvent,
    DynamicPlatformPlugin,
    HAP,
    Logging,
    PlatformAccessory,
    PlatformAccessoryEvent,
    PlatformConfig,

} from "homebridge";
import {Constants} from "../util/Constants";
import {BoschApi} from "../service/BoschApi";
import {Token} from "../model/Token";
import {DataManager} from "../util/DataManager";
import {ApplianceService} from "../service/ApplianceService";
import {CustomLogger, LoggingLevel} from "../util/CustomLogger";
import {DeviceMapping} from "../model/DeviceMapping";
import {PlatformService} from "../service/PlatformService";
import {CurrentTemperatureHandler} from "../handler/CurrentTemperatureHandler";
import {ActiveHandler} from "../handler/ActiveHandler";
import {TargetHeaterCoolerStateHandler} from "../handler/TargetHeaterCoolerStateHandler";
import {CurrentHeaterCoolerStateHandler} from "../handler/CurrentHeaterCoolerStateHandler";
import {CoolingThresholdTemperatureHandler} from "../handler/CoolingThresholdTemperatureHandler";
import {HeatingThresholdTemperatureHandler} from "../handler/HeatingThresholdTemperatureHandler";
import {RotationSpeedHandler} from "../handler/RotationSpeedHandler";
import {SwingModeHandler} from "../handler/SwingModeHandler";

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
    private readonly deviceNameMapping: Map<string, DeviceMapping>;

    private readonly applianceService: ApplianceService;
    private readonly platformService : PlatformService;

    private readonly currentTemperatureHandler: CurrentTemperatureHandler;
    private readonly activeHandler: ActiveHandler;
    private readonly targetHeaterCoolerStateHandler: TargetHeaterCoolerStateHandler;
    private readonly currentHeaterCoolerStateHandler: CurrentHeaterCoolerStateHandler;
    private readonly coolingThresholdTemperatureHandler: CoolingThresholdTemperatureHandler;
    private readonly heatingThresholdTemperatureHandler: HeatingThresholdTemperatureHandler;
    private readonly rotationSpeedHandler: RotationSpeedHandler;
    private readonly swingModeHandler: SwingModeHandler;

    private readonly accessories: PlatformAccessory[] = [];

    constructor(log: Logging, config: PlatformConfig, api: API) {
        this.setLoggingLevel(config.loggingLevel.level);
        this.log = new CustomLogger(log, 'BoschClimateSeriesDynamicPlatform');
        this.api = api;
        hap = api.hap;
        const token = new Token(config.jwtToken, config.refreshToken);

        this.boschApi = new BoschApi(token, log, api.user.persistPath());
        this.applianceService = new ApplianceService(this.boschApi, log);

        this.deviceNameMapping = this.buildDeviceNameMapping(config.deviceNameMapping);
        DataManager.refreshIntervalMillis = config.refreshInterval || DataManager.refreshIntervalMillis;
        DataManager.boschApiBearerToken = config.basicAuthToken || DataManager.boschApiBearerToken;

        this.platformService = new PlatformService(api, log);
        this.currentTemperatureHandler = new CurrentTemperatureHandler(this.applianceService, log);
        this.activeHandler = new ActiveHandler(hap, this.applianceService, log);
        this.targetHeaterCoolerStateHandler = new TargetHeaterCoolerStateHandler(hap, this.applianceService, log);
        this.currentHeaterCoolerStateHandler = new CurrentHeaterCoolerStateHandler(hap, this.applianceService, log);
        this.coolingThresholdTemperatureHandler = new CoolingThresholdTemperatureHandler(this.applianceService, log);
        this.heatingThresholdTemperatureHandler = new HeatingThresholdTemperatureHandler(this.applianceService, log);
        this.rotationSpeedHandler = new RotationSpeedHandler(this.applianceService, log);
        this.swingModeHandler = new SwingModeHandler(hap, this.applianceService, log);

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
            .onGet(this.activeHandler.onGetHandler(accessory))
            .onSet(this.activeHandler.onSetHandler(accessory));
        deviceService.getCharacteristic(hap.Characteristic.TargetHeaterCoolerState)
            .onGet(this.targetHeaterCoolerStateHandler.onGetHandler(accessory))
            .onSet(this.targetHeaterCoolerStateHandler.onSetHandler(accessory));
        deviceService.getCharacteristic(hap.Characteristic.CurrentHeaterCoolerState)
            .onGet(this.currentHeaterCoolerStateHandler.onGetHandler(accessory));
        deviceService.getCharacteristic(hap.Characteristic.CurrentTemperature)
            .onGet(this.currentTemperatureHandler.onGetHandler(accessory));
        deviceService.getCharacteristic(hap.Characteristic.Name)
            .onGet(async () => { return accessory.displayName; });
        deviceService.getCharacteristic(hap.Characteristic.CoolingThresholdTemperature)
            .setProps(this.coolingThresholdTemperatureHandler.getProps())
            .onGet(this.coolingThresholdTemperatureHandler.onGetHandler(accessory))
            .onSet(this.coolingThresholdTemperatureHandler.onSetHandler(accessory));

        deviceService.getCharacteristic(hap.Characteristic.HeatingThresholdTemperature)
            .setProps(this.heatingThresholdTemperatureHandler.getProps())
            .onGet(this.heatingThresholdTemperatureHandler.onGetHandler(accessory))
            .onSet(this.heatingThresholdTemperatureHandler.onSetHandler(accessory));

        deviceService.getCharacteristic(hap.Characteristic.RotationSpeed)
            .setProps(this.rotationSpeedHandler.getProps())
            .onGet(this.rotationSpeedHandler.onGetHandler(accessory))
            .onSet(this.rotationSpeedHandler.onSetHandler(accessory));

        deviceService.getCharacteristic(hap.Characteristic.SwingMode)
            .onGet(this.swingModeHandler.onGetHandler(accessory))
            .onSet(this.swingModeHandler.onSetHandler(accessory));

        if (accessory.context.extraTemperatureSensor) {
            const temperatureService = accessory.getService(hap.Service.TemperatureSensor)!;
            temperatureService.getCharacteristic(hap.Characteristic.CurrentTemperature)
                .onGet(this.currentTemperatureHandler.onGetHandler(accessory))
            temperatureService.getCharacteristic(hap.Characteristic.Name)
                .onGet(async () => { return "Temperature sensor"; })
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
                    this.platformService.unregisterUnavailableAccessories(gateways, this.accessories);

                    gateways.forEach(gateway => {
                        const generatedUUID = hap.uuid.generate(gateway.deviceId.valueOf());
                        const existingAccessory = this.accessories.find(accessory => accessory.UUID === generatedUUID);

                        if (!existingAccessory) {
                            const device = this.deviceNameMapping?.get(gateway.deviceId.valueOf()) || null;
                            const accessory = this.platformService.createNewAccessory(device, gateway, generatedUUID);
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
