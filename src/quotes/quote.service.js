/**
 * Created by user on 25/01/2017.
 */

'use strict';

/*const express = require('express');*/
import {doorkeeper} from "../system/door-keeper";
import * as jwt from "jsonwebtoken";
import bodyParser from 'body-parser';


const signalR = require('signalr-client');
import {treatQuotesUpdate} from "./qoutes";
import {redisClient} from "../lib/redis-client";
const express = require('express');
const config = require('../config');

//const packageJson = require('./../package.json');
const logger = require('../logger/logger.service');

logger.log('info', 'Start Server...');

const fs = require('fs');
const http = require('http');
// const https = require('https');

// var privateKey  = fs.readFileSync('../certs/fairtrade.key', 'utf8');
// var certificate = fs.readFileSync('../certs/d96c2c88c5c14294.crt', 'utf8');
//var credentials = {key: privateKey, cert: certificate};

const port = process.env.PORT || config.get("port");        // set our port
// const sslPort = config.get("ssl-port");        // set our ssl port

"use strict";
const app = express();
//app.use(logger);



/**
 * check and register each request
 */
app.use(doorkeeper);


const mode =  process.env.NODE_ENV || "development";

const redisOptions =   config.get(mode.concat(":", "redis"));

// const http = require('http').Server(app);

var httpServer = http.createServer(app);
logger.log('info', 'HTTP Server created!');
// const options = {
//     key: fs.readFileSync('../certs/fairtrade.key'),
//     cert: fs.readFileSync('../certs/d96c2c88c5c14294.crt')
// };

// https.createServer(options, (req, res) => {
//     res.writeHead(200);
//     res.end('hello world\n');
// }).listen(sslPort);

// var httpsServer = https.createServer(credentials, app);

const io = require('socket.io')(3050);

const signalRConfig = {
    server: "wss://stagingapp.fairtrade.co.il/signalr",
    hubs: ['packethub', 'balanceHub'],
    hubMethod: ["updatepagebynewdata", "syncuserclocktoserverclock","setcalcactionResult","setnewexpirytoasset"
        ,"updatetradesatexpiry","updateassetactivestatus", "OnConnectedMobile", "updatebalancemobile"
    ],
    emitData: "orderBooks",
    token: "d4c6573421cb4ac2ed836a85fd54cfc77b4e1c1688bbcbecc862de9dd221233f"
};

// var store = redis.createClient();
// var pub = redis.createClient();
// var sub = redis.createClient();

// const redisAdapter = require('socket.io-redis');
// io.adapter(redisAdapter(redisOptions));

io.on('ORDER-BOOK', function(socket){
    socket.on('orderBooks', function(msg){
        io.emit('orderBooks', msg);
    });
});


const client  = new signalR.client(

    //signalR service URL
   signalRConfig.server,

    // array of hubs to be supported in the connection
   signalRConfig.hubs,
   2, /* Reconnection Timeout is optional and defaulted to 10 seconds */
   false /* doNotStart is option and defaulted to false. If set to true client will not start until .start() is called */
);

client.proxy.host = "127.0.0.1";
client.proxy.port = "443";

let jsonData = {};

client.handlers.balancehub = {
    OnConnectedMobile: (args) => {
        console.log(JSON.stringify(args));
        logger.log("Connected To BalanceHub: "+JSON.stringify(args))
    },

     // Private Balance
    updatebalancemobile: (userId, balance) => {
        console.log(balance, userId);
        logger.log(balance, userId);
        io.emit(userId, {type: "BALANCE_UPDATE", "payload": balance});
    },
};


// hub name must be all lower case.
client.handlers.packethub = {
    // method name must be all lower case
    //		function signature should match call from hub
    // OnConnectedMobile: (args) => {
    //     console.log(JSON.stringify(args));
    // },

    updatepagebynewdata: function(name, message) {
        //console.log("revc => " + JSON.stringify(name)  + "\n" + JSON.stringify(message));
        //console.log("---update quotes-- \n");
        jsonData = {
            "name": name,
            "message": message
        };

        redisClient.get("assets",  function(err, reply) {
            let prevAssets = JSON.parse(reply);
            // console.log(reply);

            let quotesBook = treatQuotesUpdate(jsonData.name, jsonData.message, prevAssets, assetsDescription);
            redisClient.set("assets",JSON.stringify(quotesBook.assets), (err, reply) => {
                // console.log(reply);
            });

            //console.log(JSON.stringify(quotesBook));
            io.emit('orderBooks', JSON.stringify(quotesBook));
        });
    },

    syncuserclocktoserverclock: function(serverUTCClock) {
        let dateTime = new Date(serverUTCClock);
        console.log("---update clock-- " + dateTime.toLocaleString() );
        logger.log("---update clock-- " + dateTime.toLocaleString() );
    },

    setcalcactionResult: function(resultAction){
        console.log(JSON.stringify(resultAction) );
        logger.log(JSON.stringify(resultAction) );
    },

    setnewexpirytoasset: function (assetId, expiryList) {
        io.emit("TradeAsset", {type: "TRADE_ASSET.UPDATE_EXPIRY-TIME", payload: {assetId: assetId, expiries: expiryList}});
        console.log("assetId: "+JSON.stringify(assetId) );
        console.log("expiryList: "+JSON.stringify(expiryList) );
        logger.log('debug', "assetId: "+JSON.stringify(assetId) );
        logger.log('debug', "expiryList: "+JSON.stringify(expiryList) );
    },

    updatetradesatexpiry: function () {
        io.emit("TradeAsset", {type: "TRADE_ASSET.SHOULD-UPDATE"});
        console.log("should update trades" );
        logger.log('debug', "should update trades" );
    },
    
    updateassetactivestatus: function (assetId, isActive) {
        io.emit("TradeAsset", {type: "TRADE_ASSET.ACTIVE-STATUS", payload: {assetId: assetId, active: isActive}});
        console.log("assetId: "+JSON.stringify(assetId) );
        console.log('debug', "isActive: "+JSON.stringify(isActive) );
    }
};


client.serviceHandlers.onUnauthorized = (res) => {
    //Do your Login Request
    let location = res.headers.location;
    let result = httpServer.get(location, function (loginResult) {
        //Copy "set-cookie" to "client.header.cookie" for future requests
        client.headers.cookie = loginResult.headers['set-cookie'];
    });
};


client.serviceHandlers = {
    bound: () => {
        console.log("Websocket bound");
        logger.log('info', "Websocket bound");
        connectBalanceHub(signalRConfig.token);
    },
    connectFailed: (error) => {
        console.log("Websocket connectFailed: ", error);
        logger.log('info', "Websocket connectFailed: ", error);
    },

    connected: (connection) => {
        /* connection: this is the connection raised from websocket */
        console.log("Server connected", connection);
        logger.log('info', "Server connected", connection);
        connectBalanceHub(signalRConfig.token);

    },

    disconnected: () => {
        // console.log("Websocket disconnected");
        io.emit(userId, {type: "ENGINE_DISCONNECTED", "payload": ""});
    },

    onerror: (error)=> {
        console.log("Websocket onerror: ", error);
        logger.log('error', "Websocket onerror: ", error);
    },

    bindingError: (error) => {
        console.log("Websocket bindingError: ", error);
        logger.log('error', "Websocket bindingError: ", error);
    },

    connectionLost: (error) => {
        // console.log("Connection Lost: ", error);
        io.emit(userId, {type: "ENGINE_DISCONNECTED", "payload": ""});
    },

    messageReceived: (message) => {
        // console.log("Websocket messageReceived: ", message);
        return false;     // { return true /* if handled */}
    },

    reconnecting: (retry /* { inital: true/false, count: 0} */) => {
        console.log("Websocket Retrying: ", retry);
        logger.log('debug', "Websocket Retrying: ", retry);
        //return retry.count >= 3; /* cancel retry true */
        return true;
    }
};



let assetsDescription = {};

redisClient.get("AssetsDescription", (err, reply) => {
    let assets = JSON.parse(reply);
    assets.map((asset) => {
        assetsDescription[asset.id] = asset;
    });
    console.log("-----");
    console.log(JSON.stringify(assetsDescription));
    logger.log('debug', "-----");
    logger.log('debug', "getAssetDescription from redis: "+JSON.stringify(assetsDescription));
});


const connectPacketHub = (token) => {
    client.call(
        'packethub', // Hub Name (case insensitive)
        'OnConnectedMobile',	// Method Name (case insensitive)
        token //additional parameters to match signature
    )
    .done(function (err, result) {
        if (!err)  {
            if(result){
                console.log("connected to packet hub", result);
                logger.log('info', "connected to packet hub", result);
            }
            else
            {
                console.log("failed connecting to packet hub - user not authenticated", result);
                logger.log('error', "failed connecting to packet hub - user not authenticated", result);
            }
        }
    });
};

const connectBalanceHub = (token) => {
    client.call(
        'balancehub', // Hub Name (case insensitive)
        'OnConnectedMobile',	// Method Name (case insensitive)
        token //additional parameters to match signature
    )
    .done(function (err, result) {
        if (!err)  {
            if(result){
                console.log("connected to balance hub", result, token);
                logger.log('info', "connected to balance hub", result, token);
            }
            else {
                console.log("failed connecting to balance hub - user not authenticated", token);
                logger.log('error', "failed connecting to balance hub - user not authenticated", token);
            }
        }
    });
};

