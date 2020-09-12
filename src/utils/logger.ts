import { createLogger, Logger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

const { combine, timestamp, printf } = format

const myFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`
})

var transport = new DailyRotateFile({
  filename: `${process.env.LOGGER_FILE}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: false,
  maxSize: '100m',
  maxFiles: '14d'
})

export const logger: Logger = createLogger({
  level: process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'debug',
  defaultMeta: { service: 'user-service' },
  format: combine(timestamp(), myFormat),
  transports: [transport, new transports.Console()]
})
