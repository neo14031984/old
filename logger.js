const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(__dirname, 'app.log'), level: 'debug' }),
    new transports.File({ filename: path.join(__dirname, 'error.log'), level: 'error' })
  ],
  exitOnError: false
});

module.exports = logger;