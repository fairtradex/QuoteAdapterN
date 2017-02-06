const LoggerService = require('./logger.js');
LoggerService.log('info', "logger.service.js - LoggerService initialized!");
//export default require('./logger.js');
module.exports = LoggerService;
