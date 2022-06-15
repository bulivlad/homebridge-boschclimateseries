import {AccessoryPlugin, API, Logging, PlatformConfig, StaticPlatformPlugin} from "homebridge";
import {BoschApi} from "../service/BoschApi";
import {DataManager} from "../util/DataManager";
import {AcAccsessory} from "../accessory/AcAccsessory";
import {Token} from "../model/Token";
import {CustomLogger, LoggingLevel} from "../util/CustomLogger";

/**
 * @Deprecated Use {@link BoschClimateSeriesDynamicPlatform} instead
 */
export class BoschClimateSeriesStaticPlatform implements StaticPlatformPlugin {
    private readonly log: CustomLogger;
    private readonly jwtToken;
    private readonly refreshToken;
    private readonly boschApi: BoschApi;
    private readonly api: API;
    private readonly defaultLogger: Logging;

    private readonly deviceNameMapping: Map<string, string>;

    constructor(log: Logging, config: PlatformConfig, api: API) {
        this.setLoggingLevel(config.loggingLevel.level);
        this.defaultLogger = log;
        this.log = new CustomLogger(log, 'BoschClimateSeriesStaticPlatform');
        this.api = api;
        this.jwtToken = config.jwtToken;
        this.refreshToken = config.refreshToken;
        const token = new Token(this.jwtToken, this.refreshToken);

        this.boschApi = new BoschApi(token, log, api.user.persistPath());

        this.deviceNameMapping = this.buildDeviceNameMapping(config.deviceNameMapping);
        DataManager.refreshIntervalMillis = config.refreshInterval || DataManager.refreshIntervalMillis;
        DataManager.boschApiBearerToken = config.basicAuthToken || DataManager.boschApiBearerToken;

        this.log.info("BoschClimateSeriesStaticPlatform platform finished initializing!");
    }

    private buildDeviceNameMapping(deviceNameMapping: Array<any>): Map<string, string> {
        return new Map(deviceNameMapping.map(e => [e.gatewayId, e.name]))
    }

    private setLoggingLevel(value: string) {
        if (value && LoggingLevel[value.toUpperCase()]) {
            DataManager.loggingLevel = LoggingLevel[value.toUpperCase()] as number
        } else {
            DataManager.loggingLevel = LoggingLevel.INFO.valueOf()
        }
    }

    /*
     * This method is called to retrieve all accessories exposed by the platform.
     * The Platform can delay the response my invoking the callback at a later time,
     * it will delay the bridge startup though, so keep it to a minimum.
     * The set of exposed accessories CANNOT change over the lifetime of the plugin!
     */
    accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
        this.boschApi.retrieveAllGateways().then(value => {
            if (value) {
                const result = value.map(e => new AcAccsessory(this.api.hap, this.defaultLogger, this.boschApi, this.deviceNameMapping?.get(e.deviceId.valueOf()) || e.deviceId.valueOf(), e.deviceId.valueOf()))
                callback(result)
                return
            }
            callback([])
        })
            .catch(value => {
                this.log.error(value)
                callback([])
            })
    }

}
