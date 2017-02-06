const fs = require('fs');

const winston  = require('winston');
require('winston-daily-rotate-file');


// TODO: Read from configuration following parameters: env, log level, etc..
// TODO: API:  info, error, debug, trace,
const logDir = 'logs'; // Or read from a configuration
// const env = (process.env.NODE_ENV || 'development');
const env = 'development';

function dirExists(filePath)
{
  try
  {
    console.log("logger.js - trying to check if directory<"+logDir+"> exits...")
    return fs.statSync(filePath).isDirectory();
  }
  catch (e) {

    if (e.code == 'ENOENT') { // no such file or directory. File really does not exist
      console.log("logger.js - File or Directory does not exist.");
      return false;
    }

    console.log("logger.js - Exception fs.statSync (" + filePath + "): " + e);
    throw e; // something else went wrong, we don't have rights, ...
  }
}

if ( !dirExists( logDir ) ) {
    // Create the directory if it does not exist
    console.log("logger.js - No such directory "+logDir+" - trying to create it...");
    fs.mkdirSync( logDir );
    console.log("logger.js - Directory "+logDir+" has been created!");
}

console.log("logger.js - start define the logger module...");
console.log("logger.js - levels: "+winston.config.npm.levels);
console.log("logger.js - colors: "+winston.config.npm.colors);

winston.setLevels( winston.config.npm.levels );
winston.addColors( winston.config.npm.colors );

// adding timestamp with locale format
const tsFormat = () => (new Date()).toLocaleTimeString();

const logger = new winston.Logger  ({
        transports: [
            new winston.transports.Console( {
                level: env === 'development' ? 'debug' : 'info', // Only write logs of warn level or higher
                timestamp: tsFormat,
                colorize: true
            } ),
            new winston.transports.DailyRotateFile({
                level: process.env.ENV === 'development' ? 'debug' : 'info',
                timestamp: tsFormat,
                filename: logDir + '/dlogs.log',
                datePattern: 'dd-MM-yyyy.',
                maxsize: 1024 * 1024 * 10, // 10MB
                prepend: true,
              json: false,

            })
        ],
        exceptionHandlers: [
            new winston.transports.DailyRotateFile({
                datePattern: 'dd-MM-yyyy.',
                prepend: true,
                filename: logDir + '/exceptions.log'
            })
        ]
    }
);
console.log("logger.js - exporting the module logger...");
logger.log('info',"module logger initialized!");
module.exports = logger;

/*
 ,
 new winston.transports.File( {
 level: env === 'development' ? 'debug' : 'info',
 filename: logDir + '/logs.log',
 maxsize: 1024 * 1024 * 10 // 10MB
 })
 */
