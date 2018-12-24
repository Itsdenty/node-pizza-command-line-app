/*
* Server related tasks 
*
*/

//Dependencies
const http = require('http'),
  https = require('https'),
  url = require('url'),
  StringDecoder = require('string_decoder').StringDecoder,
  fs = require('fs'),
  path = require('path'),
  util = require('util'),
  debug = util.debuglog('server'),
  config = require('./config'),
  handlers = require('./handlers'),
  helpers = require('./helpers');

  // Instantiate the server module object
  const server = {};

// Instantiating the http server
server.httpServer = http.createServer((req,res) => {
  server.unifiedServer(req, res);
})

// Instantiating the https server
server.httpsServerOptions = {
  'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert' : fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
}
server.httpsServer = https.createServer(server.httpsServerOptions, (req,res) => {
  server.unifiedServer(req, res);
})

// all the server logic for both the http and https server
server.unifiedServer = (req,res) => {
    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true); 
  
    // Get the path
    const path = parsedUrl.pathname,
      trimmedPath = path.replace(/^\/+|\/+$/g,'');
    
  
    // Get the query string as an object
    const queryStringObject = parsedUrl.query;
    
    
    // Get the HTTP Method
    const method = req.method.toLowerCase();
    
    // Get the header as an object
    const headers = req.headers;
    
  
    // Get the payload if any
    const decoder = new StringDecoder('utf-8');
    let buffer = "";
    req.on('data', (data) => {
      buffer += decoder.write(data);
    })
    req.on('end', () => {
      buffer += decoder.end();
      
      // choose the handler this request should go to
      let chosenHandler = typeof(server.router[trimmedPath]) != 'undefined' ? server.router[trimmedPath] : handlers.notFound; 
      
      // If the request is within the public directory use to the public handler instead
      chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;
      
      var data = {
        trimmedPath,
        queryStringObject,
        method,
        headers,
        'payload' : helpers.parseJsonToObject(buffer)
      };
  
      // Route the request to the specified handler
      chosenHandler(data, function(statusCode, payload, contentType){

        // Determing the type of response (fall back to json)
        contentType = typeof(contentType) == 'string' ? contentType : 'json';
        // use the status code calledback or default to 200
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
        // Return the response part that are content specific
        let payloadString = '';
        if(contentType == 'json') {
          res.setHeader('Content-Type', 'application/json');
          payload = typeof(payload) == 'object' ? payload : {};
          payloadString = JSON.stringify(payload);
        }
        
        if(contentType == 'html') {
          res.setHeader('Content-Type', 'text/html');
          payloadString = typeof(payload) == 'string' ? payload : '';
        }
        
        if(contentType == 'favicon'){
          res.setHeader('Content-Type', 'image/x-icon');
          payloadString = typeof(payload) !== 'undefined' ? payload : '';
        }

        if(contentType == 'plain'){
          res.setHeader('Content-Type', 'text/plain');
          payloadString = typeof(payload) !== 'undefined' ? payload : '';
        }

        if(contentType == 'css'){
          res.setHeader('Content-Type', 'text/css');
          payloadString = typeof(payload) !== 'undefined' ? payload : '';
        }

        if(contentType == 'png'){
          res.setHeader('Content-Type', 'image/png');
          payloadString = typeof(payload) !== 'undefined' ? payload : '';
        }

        if(contentType == 'jpg'){
          res.setHeader('Content-Type', 'image/jpeg');
          payloadString = typeof(payload) !== 'undefined' ? payload : '';
        }
        // Return the response part that arere common to all content types
        res.writeHead(statusCode);
        res.end(payloadString);
  
        //if the response is 200 print red else print red
        if (statusCode == 200) {
          debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
        } else {
          debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
        }
      })
    
    })
}

// Define a request router
server.router = {
  'api/users' : handlers.users,
  'api/tokens' : handlers.tokens,
  'api/items' : handlers.items,
  'api/carts' : handlers.carts,
  'api/order' : handlers.order,
  '' : handlers.index,
  'account/create' : handlers.accountCreate,
  'account/edit' : handlers.accountEdit,
  'account/deleted' : handlers.accountDeleted,
  'session/create' : handlers.sessionCreate,
  'session/deleted' : handlers.sessionDeleted,
  'items' : handlers.itemsList,
  'cart/cleared' : handlers.cartCleared,
  'order/placed' : handlers.orderPlaced,
  'ping' : handlers.ping,
  'favicon.ico' : handlers.favicon,
  'public' : handlers.public
};

// initiate server
server.init = () => {
  // start the server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort}`);
  });
  // start the server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort}`);
    
  })  
}
// Export the server module
module.exports = server;