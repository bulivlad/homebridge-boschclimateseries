# Homebridge Bosch Climate Series

[HomeBridge](https://github.com/nfarina/homebridge) plugin to control Bosch Climate Series Air Conditiones.


## Installation
1. Install [HomeBridge](https://github.com/nfarina/homebridge).

2. Install plugin
```sh
npm install -g homebridge-boschclimateseries
```

## Configuration
Sample configuration
```json
{
  "bridge": {
    "name": "Homebridge",
    "username": "CC:22:3D:E3:CE:30",
    "port": 51826,
    "pin": "031-45-154"
  },
  "platforms": [
    {
      "name": "BoschClimateSeries",
      "jwtToken": "%BOSCH_OAUTH_TOKEN%",
      "refreshToken": "%BOSCH_OAUTH_REFRESH_TOKEN%",
      "basicAuthToken": "%BOSCH_BASIC_AUTH_TOKEN%",
      "refreshInterval": 60000,
      "deviceNameMapping": {
        "%GATEWAY_ID%": "%HOME_APP_ACCESSORY_NAME%"
      },
      "platform": "BoschClimateSeries"
    }
  ]
}
```
