import {StandardFunctions} from "../model/StandardFunctions";
import {BoschApi} from "./BoschApi";
import {Logger} from "homebridge";
import {Constants} from "../util/Constants";
import {DataManager} from "../util/DataManager";
import {CustomLogger} from "../util/CustomLogger";

export class ApplianceService {
    private standardFunctions: StandardFunctions | null = null
    private shouldRefreshStandardFunctions: boolean = true;
    private lastRefreshDate = new Date();

    private boschApi: BoschApi;
    private log: CustomLogger;

    constructor(boschApi: BoschApi, log: Logger) {
        this.boschApi = boschApi;
        this.log = new CustomLogger(log, 'ApplianceService');
    }

    retrieveDeviceState(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/acControl')[0];
                }
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find roomTemperature as the standard functions is null with error ${error}`)
                return null;
            })
    }

    retrieveCurrentRoomTemperature(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/roomTemperature')[0];
                }
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find roomTemperature as the standard functions is null with error ${error}`)
                return null;
            })
    }

    retrieveCurrentOperationMode(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/operationMode')[0];
                }
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find current operation mode as the standard functions is null with error ${error}`)
                return null;
            })
    }

    retrieveTemperatureSetPoint(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/temperatureSetpoint')[0];
                }
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find current temperature set point as the standard functions is null with error ${error}`)
                return null;
            })
    }

    retrieveFanSpeed(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/fanSpeed')[0];
                }
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find current fan speed as the standard functions is null with error ${error}`)
                return null;
            })
    }

    private async retrieveStandardFunctions(gatewayId: string) {
        if(!this.shouldRefreshData()) {
            return this.standardFunctions
        }
        return await this.callStandardFunctionsApi(gatewayId)
    }

    private shouldRefreshData(): boolean {
        return this.shouldRefreshStandardFunctions || this.standardFunctions === null || (Math.abs(this.lastRefreshDate.getTime() - new Date().getTime()) >= DataManager.refreshIntervalMillis)
    }

    private callStandardFunctionsApi(gatewayId: string) {
        const endpoint = `${Constants.baseEndpoint}${gatewayId}${Constants.currentRoomTemperature}`
        return this.boschApi.apiCall(endpoint, 'GET')
            .then(value => value.json().catch(error => {
                this.log.debug(`Failed to unpack the json from api with error ${error}`)
            }))
            .then(value => {
                this.standardFunctions = value as StandardFunctions;
                this.shouldRefreshStandardFunctions = false;
                this.lastRefreshDate = new Date();
                return this.standardFunctions
            })
            .catch(error => {
                this.log.error(`Failed to retrieve the standard functions from api ${endpoint} with error ${error}`)
                this.shouldRefreshStandardFunctions = true
                this.standardFunctions = null
                return this.standardFunctions
            })
    }

    /**
     * Turns the device on/off
     */
     changeDeviceState(desiredState: string, serialNumber: string) {
         if (this.standardFunctions && this.standardFunctions.references.filter(e => e.id === '/airConditioning/acControl')[0].value.valueOf() === desiredState) {
             this.log.debug(`Will not change the device state to ${desiredState} as it already is in this state`)
             return new Promise<string>(resolve => desiredState)
         }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.powerStateEndpoint}`
        const body = JSON.stringify({"value": desiredState})
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.shouldRefreshStandardFunctions = true;
                this.standardFunctions = null;
                this.log.debug(`Device ${serialNumber} state switched to ${desiredState}`)
                if (response.status === 204) {
                    return desiredState
                } else {
                    return desiredState === 'on' ? "off" : "on";
                }
            })
            .catch(error => {
                this.log.error(`Failed to change state to ${desiredState} for device ${serialNumber} with error ${error}`)
                return desiredState === 'on' ? "off" : "on";
            })
    }

    /**
     * Changes the device operation mode to the one set in home app
     */
    changeOperationMode(value: string, serialNumber: string) {
        if (this.standardFunctions && this.standardFunctions.references.filter(e => e.id === '/airConditioning/operationMode')[0].value.valueOf() === value) {
            this.log.debug(`Will not change the device operation mode to ${value} as it already is in this state`)
            return new Promise<string>(resolve => value)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.operationModeEndpoint}`
        const body = JSON.stringify({"value": value.toLowerCase()})
        this.log.debug(`Calling ${endpoint} with body ${body}`)
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.log.debug(`Device ${serialNumber} operation mode switched to ${value}`)
                this.shouldRefreshStandardFunctions = true;
                this.standardFunctions = null;

                if (response.status === 204) {
                    return value
                } else {
                    return null;
                }
            })
            .catch(error => {
                this.log.error(`Failed to change operation mode to ${value} for device ${serialNumber} with error ${JSON.stringify(error)}`)
                return null;
            })
    }

    setTemperatureSetPoint(value: number, serialNumber: string) {
        if (this.standardFunctions && this.standardFunctions.references.filter(e => e.id === '/airConditioning/temperatureSetpoint')[0].value.valueOf() === value.toFixed(1)) {
            this.log.debug(`Will not change the device temperature set point to ${value} as it already is in this state`)
            return new Promise<number>(() => value)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.temperatureSetPointEndpoint}`
        const body = JSON.stringify({"value": value})
        this.log.debug(`Calling ${endpoint} with body ${body}`)
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.log.debug(`Device ${serialNumber} temperature set point switched to ${value}`)
                this.shouldRefreshStandardFunctions = true;
                this.standardFunctions = null;

                if (response.status === 204) {
                    return value
                } else {
                    return null;
                }
            })
            .catch(error => {
                this.log.error(`Failed to change temperature set point to ${value} for device ${serialNumber} with error ${JSON.stringify(error)}`)
                return null;
            })
    }

    setFanSpeed(value: string, serialNumber: string) {
        if (this.standardFunctions && this.standardFunctions.references.filter(e => e.id === '/airConditioning/fanSpeed')[0].value.valueOf() === value) {
            this.log.debug(`Will not change the device fan speed to ${value} as it already is in this state`)
            return new Promise<string>(() => value)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.fanSpeedEndpoint}`
        const body = JSON.stringify({"value": value.toLowerCase()})
        this.log.debug(`Calling ${endpoint} with body ${body}`)
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.log.debug(`Device ${serialNumber} fan speed switched to ${value}`)
                this.shouldRefreshStandardFunctions = true;
                this.standardFunctions = null;

                if (response.status === 204) {
                    return value
                } else {
                    return null;
                }
            })
            .catch(error => {
                this.log.error(`Failed to change fan speed to ${value} for device ${serialNumber} with error ${JSON.stringify(error)}`)
                return null;
            })
    }

}
