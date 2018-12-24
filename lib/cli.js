/*
 * CLI-related tasks
 *
 */

// Dependencies
const readline = require('readline'),
  events = require('events'),
  libItems = require('./items'),
  _data = require('./data');
class _events extends events{};
const e = new _events();
 
// Instantiate the cli module object
const cli = {};
 
// Input handlers
e.on('man',(str) => {
  cli.responders.help();
});

e.on('help',(str) => {
  cli.responders.help();
});

e.on('exit',(str) => {
  cli.responders.exit();
});

e.on('items',(str) => {
  cli.responders.items();
});

e.on('list users',(str) => {
  cli.responders.listUsers();
});

e.on('more user info',(str) => {
  cli.responders.moreUserInfo(str);
});

e.on('list orders',(str) => {
  cli.responders.listOrders(str);
});

e.on('more order info',(str) => {
  cli.responders.moreOrderInfo(str);
});


// Responders object
cli.responders = {};

// Help / Man
cli.responders.help = () => {

  // Codify the commands and their explanations
  const commands = {
    'exit' : 'Kill the CLI (and the rest of the application)',
    'man' : 'Show this help page',
    'help' : 'Alias of the "man" command',
    'items' : 'Get statistics on the underlying operating system and resource utilization',
    'List users' : 'Show a list of all the registered (undeleted) users in the system',
    'More user info --{userId}' : 'Show details of a specified user',
    'List orders' : 'Show a list of all the orders made in the last 24 hours',
    'More order info --{userId}' : 'Show details of a specified order',
  };

  // Show a header for the help page that is as wide as the screen
  cli.horizontalLine();
  cli.centered('CLI MANUAL');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command, followed by its explanation, in white and yellow respectively
  for(let key in commands){
     if(commands.hasOwnProperty(key)){
        const value = commands[key];
        let line = '      \x1b[33m '+key+'      \x1b[0m';
        const padding = 60 - line.length;
        for (i = 0; i < padding; i++) {
            line+=' ';
        }
        line+=value;
        console.log(line);
        cli.verticalSpace();
     }
  }
  cli.verticalSpace(1);

  // End with another horizontal line
  cli.horizontalLine();

};

// Create a vertical space
cli.verticalSpace =  (lines) => {
  lines = typeof(lines) == 'number' && lines > 0 ? lines : 1;
  for (i = 0; i < lines; i++) {
      console.log('');
  }
};

// Create a horizontal line across the screen
cli.horizontalLine = () => {

  // Get the available screen size
  const width = process.stdout.columns;

  // Put in enough dashes to go across the screen
  let line = '';
  for (i = 0; i < width; i++) {
      line+='-';
  }
  console.log(line);


};

// Create centered text on the screen
cli.centered = (str) => {
  str = typeof(str) == 'string' && str.trim().length > 0 ? str.trim() : '';

  // Get the available screen size
  const width = process.stdout.columns;

  // Calculate the left padding there should be
  const leftPadding = Math.floor((width - str.length) / 2);

  // Put in left padded spaces before the string itself
  let line = '';
  for (i = 0; i < leftPadding; i++) {
      line+=' ';
  }
  line+= str;
  console.log(line);
};


// Exit
cli.responders.exit = () => {
  process.exit(0);
};

// Stats
cli.responders.items = () => {
  // Compile an object of stats
  const items = libItems;

  // Create a header for the items
  cli.horizontalLine();
  cli.centered('SYSTEM STATISTICS');
  cli.horizontalLine();
  cli.verticalSpace(2);

  items.forEach((item) => {
    let line = '      \x1b[33m '+item.id+'      \x1b[0m';
      const padding = 60 - line.length;
      line+=item.name;
      console.log(line);
      cli.verticalSpace();
  })


  // Create a footer for the stats
  cli.verticalSpace();
  cli.horizontalLine();

};


// List Users
cli.responders.listUsers = () => {
  // get all the items in the user directory
  _data.list('users',(err,userIds) => {
    // Check if a valid data is returned
    if(!err && userIds && userIds.length > 0){
      cli.verticalSpace();
      userIds.forEach((userId) => {
        // check if the data file was created within the last 24 hours
        _data.createdTime('users', userId, (err, stats) => {
          if(!err && stats && stats < 24) {
            // retrieve the user data for the current user id
            _data.read('users',userId,(err,userData) => {
              // check if a valid userData was returned
              if(!err && userData){
                // add the userData to the line string
                let line = `Name: ${userData.customerName} ${userData.address} Email: ${userData.email} Orders: `;
                const orders = typeof(userData.carts) == 'object' && userData.carts instanceof Array && userData.carts.length > 0 ? userData.carts.length : 0;
                line+=orders;
                console.log(line);
                cli.verticalSpace();
              }
            });
          }
          else {
            console.log('no users yet');
            cli.verticalSpace();
            return;
          }
        });
      });
    }
  });
};

// More user info
cli.responders.moreUserInfo = (str) => {
  // Get ID from string
  const arr = str.split('--'),
    userId = typeof(arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;
  if(userId){
    // Lookup the user
    _data.read('users',userId, (err,userData) => {
      if(!err && userData){
        // Remove the hashed password
        delete userData.hashedPassword;

        // Print their JSON object with text highlighting
        cli.verticalSpace();
        console.dir(userData,{'colors' : true});
        cli.verticalSpace();
      }
    });
  }

};

// List Orders
cli.responders.listOrders = (str) => {
  const now = Date.now();
  _data.list('carts',(err,cartIds) => {
    // check that there was no error and cartIds was returned
    if(!err && cartIds && cartIds.length > 0){
      cli.verticalSpace();
      cartIds.forEach((cartId) => {
        // check that the id reflect a time within the last 24 hours
        if (((now-cartId)/ 3600000)  < 24) {
          _data.read('carts',cartId,(err,cartData) => {
          if(!err && cartData && cartData.status != 'active'){
              // Add the cart data to the line varible 
              const line = `ID: ${cartId} with ${cartData.items.length} items ordered order was placed by user ${cartData.userEmail}`;
              console.log(line);
              cli.verticalSpace();
            }
          });
        }
        else {
        }
      })
    };
  });
}

// More check info
cli.responders.moreOrderInfo = (str) => {
//  Get ID from string
  const arr = str.split('--'),
    cartId = typeof(arr[1]) == 'string' && arr[1].trim().length > 0 ? arr[1].trim() : false;
  if(cartId){
    // Lookup the ordercart
    _data.read('carts',cartId,(err,cartData) => {
      if(!err && cartData){

        // Print their JSON object with text highlighting
        cli.verticalSpace();
        console.dir(cartData,{'colors' : true});
        cli.verticalSpace();
      }
    });
  }
};

 // Input processor
 cli.processInput = (str) => {
   str = typeof(str) == 'string' && str.trim().length > 0 ? str.trim() : false;
   // Only process the input if the user actually wrote something, otherwise ignore it
   if(str){
     // Codify the unique strings that identify the different unique questions allowed be the asked
     const uniqueInputs = [
       'man',
       'help',
       'exit',
       'items',
       'list users',
       'more user info',
       'list orders',
       'more order info',
     ];
 
     // Go through the possible inputs, emit event when a match is found
     let matchFound = false;
     const counter = 0;
     uniqueInputs.some((input) => {
       if(str.toLowerCase().indexOf(input) > -1){
         matchFound = true;
         // Emit event matching the unique input, and include the full string given
         e.emit(input,str);
         return true;
       }
     });
 
     // If no match is found, tell the user to try again
     if(!matchFound){
       console.log("Sorry, try again");
     }
 
   }
 };
 
 // Init script
 cli.init = () => {
 
   // Send to console, in dark blue
   console.log('\x1b[34m%s\x1b[0m','The CLI is running');
 
   // Start the interface
   const _interface = readline.createInterface({
     input: process.stdin,
     output: process.stdout,
     prompt: ''
   });
 
   // Create an initial prompt
   _interface.prompt();
 
   // Handle each line of input separately
   _interface.on('line', (str) => {
     // Send to the input processor
     cli.processInput(str);
 
     // Re-initialize the prompt afterwards
     _interface.prompt();
   });
 
   // If the user stops the CLI, kill the associated process
   _interface.on('close', () => {
     process.exit(0);
   });
 
 };
 
 
  // Export the module
 module.exports = cli;