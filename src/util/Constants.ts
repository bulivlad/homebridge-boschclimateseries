export class Constants {
    public static readonly PLATFORM_NAME = "BoschClimateSeries";
    public static readonly PLUGIN_NAME = "homebridge-boschclimateseries"

    public static readonly JWT_TOKEN_CACHE_KEY: string = "jwt_token"
    public static readonly baseEndpoint: string = 'https://pointt-api.bosch-thermotechnology.com/pointt-api/api/v1/gateways/'
    public static readonly refreshTokenEndpoint: string = 'https://identity.bosch.com/connect/token'
    public static readonly currentRoomTemperature: string = '/resource/airConditioning/standardFunctions'
    public static readonly powerStateEndpoint: string = '/resource/airConditioning/acControl'
    public static readonly operationModeEndpoint: string = '/resource/airConditioning/operationMode'
    public static readonly temperatureSetPointEndpoint: string = '/resource/airConditioning/temperatureSetpoint'
    public static readonly fanSpeedEndpoint: string = '/resource/airConditioning/fanSpeed'
    public static readonly airFlowVerticalEndpoint: string = '/resource/airConditioning/airFlowVertical'
    public static readonly airFlowHorizontalEndpoint: string = '/resource/airConditioning/airFlowHorizontal'
}
