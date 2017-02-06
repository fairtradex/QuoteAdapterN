/**
 * Created by user on 25/01/2017.
 */

import logger from '../logger/logger.service';
const config = require('../config');

// read from node env
const mode =  process.env.NODE_ENV || "development";
const redisOptions =   config.get(mode.concat(":", "redis"));

const redis = require('redis');


export const redisClient = redis.createClient(
    redisOptions.port,
    redisOptions.host,
    {
        auth_pass: redisOptions.password,
        tls: {
            servername: redisOptions.host
        }
    }
);


redisClient.on("connect", function () {
    logger.log('info', 'QuoteAdapterN connected to Redis');
});


redisClient.on("error", function (err) {
    logger.log('error', 'QuoteAdapterN Redis', err);
});

// redisClient.sadd("connections", "John");
// redisClient.sadd("connections", "Vasya");
// redisClient.sadd("connections", "Stepan");
// redisClient.sadd("connections", "Anton");
// redisClient.sadd("connections", "Anton");
// redisClient.sadd("connections", "Berry1");

//
// redisClient.smembers("connections", function(err, names){
//     console.log(names); //["John", "Jane"]
// });
//
// redisClient.srem("connections", "Fred",  (err)=> {
//         console.log(err);
//     }
// );
// redisClient.srem("connections", "Berry1");
// redisClient.srem("connections", "Berry");
//
// redisClient.smembers("connections", function(err, names){
//     console.log(names); //["John", "Jane"]
// });
//
//
//
// //
// // console.log("--Redis started------------");
// redisClient.quit();
