import winston from 'winston'

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug'

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tipu-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`
          if (Object.keys(meta).length > 0 && service) {
            log += ` ${JSON.stringify({ service, ...meta })}`
          }
          return log
        })
      ),
    }),
  ],
})

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  )
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  )
}
