/* 
* Primary file for the api
*
*/

const server = require('./lib/server'),
  cli = require('./lib/cli');
// Declare the app
const app = {};

// Init function
app.init = () => {
  // Start the server 
  server.init();
  // Start the CLI, but make sure it starts last
  setTimeout(function(){
    cli.init();
  },50);
};

// Execute
app.init();

// Export the app
module.exports = app;