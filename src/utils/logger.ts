import { createLogger, Logger, format, transports } from 'winston'
const { combine, timestamp, printf } = format

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`
})

export const logger: Logger = createLogger({
  level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info',
  defaultMeta: { service: 'user-service' },
  format: combine(timestamp(), myFormat),
  transports: [
    new transports.File({ level: 'debug', filename: process.env.LOGGER_FILE }),
    new transports.Console()
  ]
})
