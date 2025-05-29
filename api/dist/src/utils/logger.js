"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.currentLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
    }
    formatMessage(level, message, context) {
        const timestamp = new Date().toISOString();
        const levelName = LogLevel[level];
        const contextStr = context ? ` ${JSON.stringify(context)}` : '';
        return `[${timestamp}] ${levelName}: ${message}${contextStr}`;
    }
    shouldLog(level) {
        return level >= this.currentLevel;
    }
    debug(message, context) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.log(this.formatMessage(LogLevel.DEBUG, message, context));
        }
    }
    info(message, context) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.log(this.formatMessage(LogLevel.INFO, message, context));
        }
    }
    warn(message, context) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage(LogLevel.WARN, message, context));
        }
    }
    error(message, context) {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatMessage(LogLevel.ERROR, message, context));
        }
    }
    setLevel(level) {
        this.currentLevel = level;
    }
}
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map