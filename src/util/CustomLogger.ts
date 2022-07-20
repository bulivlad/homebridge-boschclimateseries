import type {Logger} from 'homebridge';
import {DataManager} from "./DataManager";

export class CustomLogger {
    private readonly level: number;

    constructor(private logger: Logger, private readonly prefix: string | null = null) {
        logs = this;
        this.level = DataManager.loggingLevel;
    }

    trace(message, ...parameters: any[]) {
        if (this.level.valueOf() === 5) {
            this.logger.info(this.getMessage(message, this.prefix), ...parameters);
        }
    }

    debug(message, ...parameters: any[]) {
        if (this.level.valueOf() >= 4) {
            this.logger.debug(this.getMessage(message, this.prefix), ...parameters);
        }
    }

    info(message, ...parameters: any[]) {
        if (this.level.valueOf() >= 3) {
            this.logger.info(this.getMessage(message, this.prefix), ...parameters);
        }
    }

    warn(message, ...parameters: any[]) {
        if (this.level.valueOf() >= 2) {
            this.logger.warn(this.getMessage(message, this.prefix), ...parameters);
        }
    }

    error(message, ...parameters: any[]) {
        if (this.level.valueOf() >= 1) {
            this.logger.error(this.getMessage(message, this.prefix), ...parameters);
        }
    }

    private getMessage(message: string, prefix: string | null): string {
        if (prefix) {
            // return '['.concat(prefix.concat(' - ', message));
            return `[${new Date().getTime()}, ` + prefix.concat(' - ', message) + ']';
        }
        return message;
    }
}

let logs: CustomLogger;

export function getLogs() {
    return logs;
}

export enum LoggingLevel {
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
    TRACE = 5
}
