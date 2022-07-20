import {StandardFunctions} from "../model/StandardFunctions";
import {BoschApi} from "./BoschApi";
import {Logger} from "homebridge";
import {Constants} from "../util/Constants";
import {DataManager} from "../util/DataManager";
import {CustomLogger} from "../util/CustomLogger";
import {Utils} from "../util/Utils";

export class ApplianceService {
    private standardFunctions: Map<string, StandardFunctions> = new Map<string, StandardFunctions>();
    private shouldRefreshStandardFunctions: Map<string, boolean> = new Map<string, boolean>();
    private lastRefreshDate: Map<string, Date> = new Map<string, Date>();
    private isRequestOngoing: Map<string, boolean> = new Map<string, boolean>();

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
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find roomTemperature as the standard functions is null with error ${error}`)
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
    }

    retrieveCurrentRoomTemperature(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/roomTemperature')[0];
                }
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find roomTemperature as the standard functions is null with error ${error}`)
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
    }

    retrieveCurrentOperationMode(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/operationMode')[0];
                }
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find current operation mode as the standard functions is null with error ${error}`)
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
    }

    retrieveTemperatureSetPoint(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/temperatureSetpoint')[0];
                }
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find current temperature set point as the standard functions is null with error ${error}`)
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
    }

    retrieveFanSpeed(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/fanSpeed')[0];
                }
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find current fan speed as the standard functions is null with error ${error}`)
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
    }

    retrieveAirFlowVertical(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/airFlowVertical')[0];
                }
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find current air flow vertical as the standard functions is null with error ${error}`)
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
    }

    retrieveAirFlowHorizontal(gatewayId: string) {
        return this.retrieveStandardFunctions(gatewayId)
            .then(value => {
                if (value) {
                    return value.references.filter(e => e.id === '/airConditioning/airFlowHorizontal')[0];
                }
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
            .catch(error => {
                this.log.error(`Cannot find current air flow horizontal as the standard functions is null with error ${error}`)
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                return null;
            })
    }

    private async retrieveStandardFunctions(gatewayId: string) {
        let retrieveState: boolean = true;
        try {
            retrieveState = this.shouldRefreshData(gatewayId);
            this.log.trace("shouldRefreshData(%s) = %s", gatewayId, retrieveState);
            if (retrieveState && this.isRequestOngoing != null && this.isRequestOngoing.get(gatewayId) != null && this.isRequestOngoing.get(gatewayId)) {
                this.log.trace("A request for getting the device %s current state is on going. Delay for 1000ms", gatewayId);

                await new Promise(resolve => setTimeout(resolve, 1000)).then(() => this.log.trace("Done waiting for getting device %s state", gatewayId));

                retrieveState = this.shouldRefreshData(gatewayId);
            }
        } catch (e) {
            this.log.error("Failed to get shouldRefreshData(%s), proceeding to request the data from server", gatewayId);
            retrieveState = true;
        }

        if (!retrieveState) {
            this.log.trace(`Returning this.standardFunctions.get(${gatewayId}) from memory`);
            return this.standardFunctions.get(gatewayId);
        }
        this.log.trace(`Calling await this.callStandardFunctionsApi(${gatewayId})`);

        return await this.callStandardFunctionsApi(gatewayId);
    }

    private retrieveCurrentState(gatewayId: string, feature: string): string | null | undefined {
        return this.standardFunctions &&
            this.standardFunctions.get(gatewayId) &&
            this.standardFunctions.get(gatewayId)!.references.filter(e => e.id === feature)[0].value.valueOf();
    }

    private shouldRefreshData(gatewayId: string): boolean {
        this.log.debug("%s millis since last refresh for %s", !this.lastRefreshDate.get(gatewayId) ? "not refreshed yet" : Math.abs(this.lastRefreshDate.get(gatewayId)!.getTime() - new Date().getTime()), gatewayId);
        this.log.debug("%s refresh interval for %s", DataManager.refreshIntervalMillis, gatewayId);
        return this.shouldRefreshStandardFunctions.get(gatewayId) == undefined ||
            this.shouldRefreshStandardFunctions.get(gatewayId) ||
            !this.standardFunctions ||
            !this.standardFunctions.get(gatewayId) ||
            !this.lastRefreshDate.get(gatewayId) ||
            (Math.abs(this.lastRefreshDate.get(gatewayId)!.getTime() - new Date().getTime()) >= DataManager.refreshIntervalMillis);
    }

    private callStandardFunctionsApi(gatewayId: string): Promise<StandardFunctions | undefined> {
        this.isRequestOngoing.set(gatewayId, true);
        const endpoint = `${Constants.baseEndpoint}${gatewayId}${Constants.currentRoomTemperature}`
        this.log.trace(`A request for %s is ongoing this.isRequestOngoing=${Utils.mapToString(this.isRequestOngoing)}`, endpoint);
        return this.boschApi.apiCall(endpoint, 'GET')
            .then(value => value.json().catch(error => {
                this.log.debug(`Failed to unpack the json from api with error ${error}`)
            }))
            .then(value => {
                this.standardFunctions.set(gatewayId, value as StandardFunctions);
                this.shouldRefreshStandardFunctions.set(gatewayId, false);
                this.lastRefreshDate.set(gatewayId, new Date());
                return this.standardFunctions.get(gatewayId);
            })
            .catch(error => {
                this.log.error(`Failed to retrieve the standard functions from api ${endpoint} with error ${JSON.stringify(error)}`)
                this.shouldRefreshStandardFunctions.set(gatewayId, true);
                this.standardFunctions = new Map<string, StandardFunctions>()
                return undefined
            })
            .finally(() => {
                this.isRequestOngoing.set(gatewayId, false);
                this.log.trace(`The request for %s finished this.isRequestOngoing=${Utils.mapToString(this.isRequestOngoing)}`, endpoint);
            });
    }

    /**
     * Turns the device on/off
     */
    changeDeviceState(desiredState: string, serialNumber: string) {
        const currentState = this.retrieveCurrentState(serialNumber, '/airConditioning/acControl');
        if (currentState && currentState === desiredState) {
            this.log.debug(`Will not change the device state to ${desiredState} as it already is in this state`)
            return new Promise<string>(resolve => desiredState)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.powerStateEndpoint}`
        const body = JSON.stringify({"value": desiredState})
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                this.standardFunctions.delete(serialNumber);
                this.log.debug(`Device ${serialNumber} state switched to ${desiredState}`)
                if (response.status === 204) {
                    return desiredState
                } else {
                    return desiredState === 'on' ? "off" : "on";
                }
            })
            .catch(error => {
                this.log.error(`Failed to change state to ${desiredState} for device ${serialNumber} with error ${error}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                return desiredState === 'on' ? "off" : "on";
            })
    }

    /**
     * Changes the device operation mode to the one set in home app
     */
    changeOperationMode(value: string, serialNumber: string) {
        const currentState = this.retrieveCurrentState(serialNumber, '/airConditioning/operationMode');
        if (currentState && currentState === value) {
            this.log.debug(`Will not change the device operation mode to ${value} as it already is in this state`)
            return new Promise<string>(resolve => value)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.operationModeEndpoint}`
        const body = JSON.stringify({"value": value.toLowerCase()})
        this.log.debug(`Calling ${endpoint} with body ${body}`)
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.log.debug(`Device ${serialNumber} operation mode switched to ${value}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                this.standardFunctions.delete(serialNumber);

                if (response.status === 204) {
                    return value
                } else {
                    return null;
                }
            })
            .catch(error => {
                this.log.error(`Failed to change operation mode to ${value} for device ${serialNumber} with error ${JSON.stringify(error)}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                return null;
            })
    }

    setTemperatureSetPoint(value: number, serialNumber: string) {
        const currentState = this.retrieveCurrentState(serialNumber, '/airConditioning/temperatureSetpoint');
        if (currentState && currentState === value.toFixed(1)) {
            this.log.debug(`Will not change the device temperature set point to ${value} as it already is in this state`)
            return new Promise<number>(() => value)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.temperatureSetPointEndpoint}`
        const body = JSON.stringify({"value": value})
        this.log.debug(`Calling ${endpoint} with body ${body}`)
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.log.debug(`Device ${serialNumber} temperature set point switched to ${value}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                this.standardFunctions.delete(serialNumber);

                if (response.status === 204) {
                    return value
                } else {
                    return null;
                }
            })
            .catch(error => {
                this.log.error(`Failed to change temperature set point to ${value} for device ${serialNumber} with error ${JSON.stringify(error)}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                return null;
            })
    }

    setFanSpeed(value: string, serialNumber: string) {
        const currentState = this.retrieveCurrentState(serialNumber, '/airConditioning/fanSpeed');
        if (currentState && currentState === value) {
            this.log.debug(`Will not change the device fan speed to ${value} as it already is in this state`)
            return new Promise<string>(() => value)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.fanSpeedEndpoint}`
        const body = JSON.stringify({"value": value.toLowerCase()})
        this.log.debug(`Calling ${endpoint} with body ${body}`)
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.log.debug(`Device ${serialNumber} fan speed switched to ${value}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                this.standardFunctions.delete(serialNumber);

                if (response.status === 204) {
                    return value
                } else {
                    return null;
                }
            })
            .catch(error => {
                this.log.error(`Failed to change fan speed to ${value} for device ${serialNumber} with error ${JSON.stringify(error)}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                return null;
            })
    }

    setAirFlowVertical(value: string, serialNumber: string) {
        const currentState = this.retrieveCurrentState(serialNumber, '/airConditioning/airFlowVertical');
        if (currentState && currentState === value) {
            this.log.debug(`Will not change the device ${serialNumber} air flow vertical to ${value} as it already is in this state`)
            return new Promise<string>(() => value)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.airFlowVerticalEndpoint}`
        const body = JSON.stringify({"value": value.toLowerCase()})
        this.log.debug(`Calling ${endpoint} with body ${body}`)
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.log.debug(`Device ${serialNumber} air flow vertical switched to ${value}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                this.standardFunctions.delete(serialNumber);

                if (response.status === 204) {
                    return value
                } else {
                    return null;
                }
            })
            .catch(error => {
                this.log.error(`Failed to change air flow vertical to ${value} for device ${serialNumber} with error ${JSON.stringify(error)}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                return null;
            })
    }

    setAirFlowHorizontal(value: string, serialNumber: string) {
        const currentState = this.retrieveCurrentState(serialNumber, '/airConditioning/airFlowHorizontal');
        if (currentState && currentState === value) {
            this.log.debug(`Will not change the device ${serialNumber} air flow horizontal to ${value} as it already is in this state`)
            return new Promise<string>(() => value)
        }

        const endpoint = `${Constants.baseEndpoint}${serialNumber}${Constants.airFlowHorizontalEndpoint}`
        const body = JSON.stringify({"value": value.toLowerCase()})
        this.log.debug(`Calling ${endpoint} with body ${body}`)
        return this.boschApi.apiCall(endpoint, 'PUT', body)
            .then(response => {
                this.log.debug(`Device ${serialNumber} air flow horizontal switched to ${value}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                this.standardFunctions?.delete(serialNumber);

                if (response.status === 204) {
                    return value
                } else {
                    return null;
                }
            })
            .catch(error => {
                this.log.error(`Failed to change air flow horizontal to ${value} for device ${serialNumber} with error ${JSON.stringify(error)}`)
                this.shouldRefreshStandardFunctions.set(serialNumber, true);
                return null;
            })
    }

}
