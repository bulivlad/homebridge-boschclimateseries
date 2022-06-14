// @ts-ignore
import fetch from 'node-fetch';
import {Logger} from "homebridge";
import {Token} from "../model/Token";
import {Gateway} from "../model/Gateway";
import {Constants} from "../util/Constants";
import storage from "node-persist"
import {DataManager} from "../util/DataManager";
import {CustomLogger} from "../util/CustomLogger";

export class BoschApi {
    private token: Token;
    private readonly log: CustomLogger;
    private readonly cacheDirectory: string;

    constructor(token: Token, log: Logger, cacheDirectory: string) {
        this.cacheDirectory = cacheDirectory
        this.token = token
        this.log = new CustomLogger(log, 'BoschApi');
        storage.initSync({dir: this.cacheDirectory, forgiveParseErrors: true})
    }


    retrieveAllGateways(): Promise<Gateway[]> {
        return this.apiCall(Constants.baseEndpoint, 'GET')
            .then(value => value.json().catch(error => {
                this.log.error(error)
                throw error
            }))
            .then(value => value as Array<Gateway>)
    }

    async apiCall(endpoint: String, httpMethod: String, body: {} | null = null, retries: number = 1): Promise<any> {
        this.log.debug("Getting token from cache");
        let token: Token = await storage.getItem(Constants.JWT_TOKEN_CACHE_KEY)
        if (!token) {
            this.log.debug(`Adding token to cache`)
            await storage.setItem(Constants.JWT_TOKEN_CACHE_KEY, this.token)
            token = this.token
        } else {
            this.log.debug(`Got token from cache`);
        }
        return fetch(endpoint.valueOf(), {
            method: httpMethod.valueOf(),
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'Content-Type': 'application/json'
            },
            body: body
        }).then(response => {
            if (response && response.status) {
                this.log.debug(`Got response status ${response.status} for calling ${endpoint}`)
            }
            if (!(response.status >= 200 && response.status < 300)) {
                this.log.warn(`Call to ${endpoint} failed with code ${response.status} for body ${JSON.stringify(response.body)}`)
                throw response
            }
            return response
        })
            .catch(error => {
                if (retries == 0) {
                    throw new Error(`No retries left for call ${endpoint}`)
                }
                if (error.status === 401) {
                    this.log.warn("Expired JWT token. Trying to refresh!")
                    return this.refreshToken(endpoint, httpMethod).then(response => {
                        this.log.info(`Token refreshed! Refresh the call ${endpoint}!`)
                        return this.apiCall(endpoint, httpMethod, null, retries - 1)
                    }).catch(error => {
                        throw new Error(error)
                    })
                } else {
                    throw error
                }
            })
    }

    private async refreshToken(endpoint: String, httpMethod: String): Promise<any> {
        this.log.debug("Calling refresh token api")
        let token: Token = await storage.getItem(Constants.JWT_TOKEN_CACHE_KEY)
        this.log.debug(`Got refresh token from cache`)
        let details = {
            'refresh_token': token.refresh_token,
            'grant_type': 'refresh_token'
        };

        let formBody: string[] = [];
        for (let property in details) {
            let encodedKey = encodeURIComponent(property);
            let encodedValue = encodeURIComponent(details[property]);
            formBody.push(encodedKey + "=" + encodedValue);
        }
        const body: string = formBody.join("&");

        return fetch(Constants.refreshTokenEndpoint.valueOf(), {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${DataManager.boschApiBearerToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'HomeCom%20Easy/22.03.22.2100 CFNetwork/1333.0.4 Darwin/21.5.0'
            },
            body: body
        }).then(response => {
            if (!response.ok) {
                this.log.error(`Refresh token failed with code ${response.status}`)
                throw response
            }
            return response.json()
        })
            .then(response => response as Token)
            .then(response => {
                this.log.debug("Token refreshed OK!")
                this.token = response as Token
                storage.setItem(Constants.JWT_TOKEN_CACHE_KEY, this.token)
                return response
            })
            .catch(error => {
                this.log.error(`Failed to refresh token with error ${JSON.stringify(error.body)}`)
                throw error
            })
    }
}
