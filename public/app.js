/*
 * Frontend Logic for application
 *
 */

const app = {};

// Config
app.config = {
  'sessionToken' : false
};

// AJAX Client (for RESTful API)
app.client = {}

// Interface for making API calls
app.client.request = function(headers,path,method,queryStringObject,payload,callback){

  // Set defaults
  headers = typeof(headers) == 'object' && headers !== null ? headers : {};
  path = typeof(path) == 'string' ? path : '/';
  method = typeof(method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof(payload) == 'object' && payload !== null ? payload : {};
  callback = typeof(callback) == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  let requestUrl = path+'?';
  let counter = 0;
  for(let queryKey in queryStringObject){
     if(queryStringObject.hasOwnProperty(queryKey)){
       counter++;
       // If at least one query string parameter has already been added, preprend new ones with an ampersand
       if(counter > 1){
         requestUrl+='&';
       }
       // Add the key and value
       requestUrl+=queryKey+'='+queryStringObject[queryKey];
     }
  }

  // Form the http request as a JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-type", "application/json");

  // For each header sent, add it to the request
  for(let headerKey in headers){
     if(headers.hasOwnProperty(headerKey)){
       xhr.setRequestHeader(headerKey, headers[headerKey]);
     }
  }

  // If there is a current session token set, add that as a header
  if(app.config.sessionToken){
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function() {
      if(xhr.readyState == XMLHttpRequest.DONE) {
        const statusCode = xhr.status;
        const responseReturned = xhr.responseText;

        // Callback if requested
        if(callback){
          try{
            const parsedResponse = JSON.parse(responseReturned);
            callback(statusCode,parsedResponse);
          } catch(e){
            callback(statusCode,false);
          }

        }
      }
  }

  // Send the payload as JSON
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);

};
// Bind the logout button
app.bindLogoutButton = function(){
  document.getElementById("logoutButton").addEventListener("click", function(e){

    // Stop it from redirecting anywhere
    e.preventDefault();
    // Log the user out
    app.logUserOut();

  });
};

// Bind the delete cart button
app.bindDeleteCartButton = function(){
  document.getElementById("deleteCart").addEventListener("click", function(e){

    // Stop it from redirecting anywhere
    e.preventDefault();
    // Log the user out
    app.deleteCart();

  });
};

// Bind place order button
app.bindPlaceOrderButton = function(){
  document.getElementById("placeOrder").addEventListener("click", function(e){

    // Stop it from redirecting anywhere
    e.preventDefault();
    // Log the user out
    app.placeOrder();

  });
};

// Log the user out then redirect them
app.logUserOut = function(){
  // Get the current token id
  var tokenId = typeof(app.config.sessionToken.id) == 'string' ? app.config.sessionToken.id : false;

  // Send the current token to the tokens endpoint to delete it
  var queryStringObject = {
    'id' : tokenId
  };
  app.client.request(undefined,'api/tokens','DELETE',queryStringObject,undefined,function(statusCode,responsePayload){
    // Set the app.config token as false
    app.setSessionToken(false);

    // Send the user to the logged out page
    window.location = '/session/deleted';

  });
};

// Bind the forms
app.bindForms = function(){
  if(document.querySelector("form")){
    var allForms = document.querySelectorAll("form");
    for(var i = 0; i < allForms.length; i++){
        allForms[i].addEventListener("submit", function(e){
        // Stop it from submitting
        e.preventDefault();
        var formId = this.id;
        var path = this.action;
        var method = this.method.toUpperCase();
          console.log(formId,path, method);
        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector("#"+formId+" .formError").style.display = 'none';

        // Hide the success message (if it's currently shown due to a previous error)
        if(document.querySelector("#"+formId+" .formSuccess")){
          document.querySelector("#"+formId+" .formSuccess").style.display = 'none';
        }


        // Turn the inputs into a payload
        var payload = {};
        var elements = this.elements;
        for(var i = 0; i < elements.length; i++){
          if(elements[i].type !== 'submit'){
            // Determine class of element and set value accordingly
            var classOfElement = typeof(elements[i].classList.value) == 'string' && elements[i].classList.value.length > 0 ? elements[i].classList.value : '';
            var valueOfElement = elements[i].type == 'checkbox' && classOfElement.indexOf('multiselect') == -1 ? elements[i].checked : classOfElement.indexOf('intval') == -1 ? elements[i].value : parseInt(elements[i].value);
            var elementIsChecked = elements[i].checked;
            // Override the method of the form if the input's name is _method
            var nameOfElement = elements[i].name;
            if(nameOfElement == '_method'){
              method = valueOfElement;
            } else {
              // Create an payload field named "method" if the elements name is actually httpmethod
              if(nameOfElement == 'httpmethod'){
                nameOfElement = 'method';
              }
              // If the element has the class "multiselect" add its value(s) as array elements
              if(classOfElement.indexOf('multiselect') > -1){
                if(elementIsChecked){
                  payload[nameOfElement] = typeof(payload[nameOfElement]) == 'object' && payload[nameOfElement] instanceof Array ? payload[nameOfElement] : [];
                  var quantity = document.getElementById(valueOfElement + '-update')
                  var item = {'id' : valueOfElement, 'quantity' : quantity.value};
                  console.log(elementIsChecked, classOfElement, valueOfElement, item);
                  payload[nameOfElement].push(item);
                }
              } else {
                payload[nameOfElement] = valueOfElement;
              }

            }
          }
        }

        // If the method is DELETE, the payload should be a queryStringObject instead
        var queryStringObject = method == 'DELETE' ? payload : {};

        // Call the API
        app.client.request(undefined,path,method,queryStringObject,payload,function(statusCode,responsePayload){
          // Display an error on the form if needed
          if(statusCode !== 200){

            if(statusCode == 403){
              // log the user out
              app.logUserOut();

            } else {

              // Try to get the error from the api, or set a default error message
              var error = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has occured, please try again';

              // Set the formError field with the error text
              document.querySelector("#"+formId+" .formError").innerHTML = error;

              // Show (unhide) the form error field on the form
              document.querySelector("#"+formId+" .formError").style.display = 'block';
            }
          } else {
            // If successful, send to form response processor
            app.formResponseProcessor(formId,payload,responsePayload);
          }

        });
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = function(formId,requestPayload,responsePayload){
  var functionToCall = false;
  // If account creation was successful, try to immediately log the user in
  if(formId == 'accountCreate'){
    // Take the phone and password, and use it to log the user in
    var newPayload = {
      'phone' : requestPayload.phone,
      'password' : requestPayload.password
    };

    app.client.request(undefined,'api/tokens','POST',undefined,newPayload,function(newStatusCode,newResponsePayload){
      // Display an error on the form if needed
      if(newStatusCode !== 200){

        // Set the formError field with the error text
        document.querySelector("#"+formId+" .formError").innerHTML = 'Sorry, an error has occured. Please try again.';

        // Show (unhide) the form error field on the form
        document.querySelector("#"+formId+" .formError").style.display = 'block';

      } else {
        // If successful, set the token and redirect the user
        app.setSessionToken(newResponsePayload);
        window.location = '/items';
      }
    });
  }

  // If login was successful, set the token in localstorage and redirect the user
  if(formId == 'sessionCreate'){
    app.setSessionToken(responsePayload);
    window.location = '/items';
  }

  // If the user just deleted their account, redirect them to the account-delete page
  if(formId == 'accountEdit3'){
    app.logUserOut(false);
    window.location = '/account/deleted';
  }

  // If forms saved successfully and they have success messages, show them
  var formsWithSuccessMessages = ['accountEdit1', 'accountEdit2'];
  if(formsWithSuccessMessages.indexOf(formId) > -1){
    document.querySelector("#"+formId+" .formSuccess").style.display = 'block';
  }

  // If the user just created a new check successfully, redirect back to the dashboard
  if(formId == 'itemList'){
    window.location.reload();
  }
};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function(){
  var tokenString = localStorage.getItem('token');
  if(typeof(tokenString) == 'string'){
    try{
      var token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if(typeof(token) == 'object'){
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    }catch(e){
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function(add){
  var target = document.querySelector("body");
  if(add){
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function(token){
  app.config.sessionToken = token;
  var tokenString = JSON.stringify(token);
  localStorage.setItem('token',tokenString);
  if(typeof(token) == 'object'){
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = function(callback){
  var currentToken = typeof(app.config.sessionToken) == 'object' ? app.config.sessionToken : false;
  if(currentToken){
    // Update the token with a new expiration
    var payload = {
      'id' : currentToken.id,
      'extend' : true,
    };
    app.client.request(undefined,'api/tokens','PUT',undefined,payload,function(statusCode,responsePayload){
      // Display an error on the form if needed
      if(statusCode == 200){
        // Get the new token details
        var queryStringObject = {'id' : currentToken.id};
        app.client.request(undefined,'api/tokens','GET',queryStringObject,undefined,function(statusCode,responsePayload){
          // Display an error on the form if needed
          if(statusCode == 200){
            app.setSessionToken(responsePayload);
            callback(false);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    });
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};
// Load data on the page
app.loadDataOnPage = function(){
  // Get the current page from the body class
  var bodyClasses = document.querySelector("body").classList;
  var primaryClass = typeof(bodyClasses[0]) == 'string' ? bodyClasses[0] : false;

  // Logic for dashboard page
  if(primaryClass == 'itemsList'){
    app.loadItemsListPage();
  }

  // Logic for account settings page
  if(primaryClass == 'accountEdit'){
    app.loadAccountEditPage();
  }
};

// Load the account edit page specifically
app.deleteCart = function(){
  app.client.request(undefined,'api/carts','DELETE',undefined,undefined,function(statusCode,responsePayload){
    if(statusCode == 200){
      console.log('success');
      window.location = '/cart/cleared';
    } else {
      // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
      app.logUserOut();
    }
  });
};

// place selected pizza order
app.placeOrder = function(){
  app.client.request(undefined,'api/order','GET',undefined,undefined,function(statusCode,responsePayload){
    if(statusCode == 200){
      console.log('success');
      window.location = '/order/placed';
    } else {
      // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
      app.logUserOut();
    }
  });
};

// Load the account edit page specifically
app.loadAccountEditPage = function(){
  // Get the phone number from the current token, or log the user out if none is there
  var email = typeof(app.config.sessionToken.email) == 'string' ? app.config.sessionToken.email : false;
  if(email){
    // Fetch the user data
    var queryStringObject = {
      'email' : email
    };
    app.client.request(undefined,'api/users','GET',queryStringObject,undefined,function(statusCode,responsePayload){
      if(statusCode == 200){
        // Put the data into the forms as values where needed
        document.querySelector("#accountEdit1 .customerNameInput").value = responsePayload.customerName;
        document.querySelector("#accountEdit1 .addressInput").value = responsePayload.address;
        document.querySelector("#accountEdit1 .displayEmailInput").value = responsePayload.email;

        // Put the hidden phone field into both forms
        var hiddenPhoneInputs = document.querySelectorAll("input.hiddenPhoneNumberInput");
        for(var i = 0; i < hiddenPhoneInputs.length; i++){
            hiddenPhoneInputs[i].value = responsePayload.email;
        }

      } else {
        // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }
};

// Load the dashboard page specifically
app.loadItemsListPage = function(){
    app.client.request(undefined,'api/carts','GET',undefined,undefined,function(statusCode,responsePayload){
      // Check if statusCodes is neither 403 nor 400 so the payload can be processed
      if(statusCode != 403 || statusCode != 400){
        
        // check if the statusCode of the response is 200 so the page would be customized for existing order
        if(statusCode == 200){
          var cartData = responsePayload.cartItems;
          var cartItems = [];
          var cartQuantities = [];
          var cartRow = 0;
          var items = responsePayload.items;
          // Retrieve each item and add it to a table row
          items.forEach(function(item){
              cartData.forEach(function(cartItem){
                cartItems.push(cartItem.id);
                cartQuantities.push(cartItem.quantity);
              });
              var table = document.getElementById("checksListTable");
              var tr = table.insertRow(-1);
              tr.classList.add('checkRow');
              var td0 = tr.insertCell(0);
              var td1 = tr.insertCell(1);
              var td2 = tr.insertCell(2);
              var td3 = tr.insertCell(3);
              var td4 = tr.insertCell(4);
              td0.innerHTML = item.id;
              td1.innerHTML = item.name;
              td2.innerHTML = item.price + ' USD';
              // if the item is in the cart, check it and add the quantity
              if(cartItems.indexOf(item.id) > -1) {
                td3.innerHTML = "<input type=\"checkbox\" class=\"successCodesInput multiselect\" name=\"items\" value=\""+ item.id+ "\" checked>";
                td4.innerHTML = "<input type=\"text\" id=\"" + item.id + "-update\" name=\"" + item.id + "-update\" value=\"" + cartQuantities[cartRow] + "\">";
                cartRow++;
              } else {
                td3.innerHTML = "<input type=\"checkbox\" class=\"successCodesInput multiselect\" name=\"items\" value=\""+ item.id+ "\">";
                td4.innerHTML = "<input type=\"text\" id=\"" + item.id + "-update\">" 
              }
            });
            var table = document.getElementById("checksListTable");
            // create button for order/cart actions
            var buttons = "<input type=\"hidden\" name=\"_method\" value=\"PUT\">";
            buttons += "<input type=\"button\" id=\"deleteCart\" class=\"cta red mini\" value=\"Delete Cart\">";
            buttons += "<input type=\"submit\" class=\"cta green mini\" value=\"Update Cart\">";
            buttons += "<input type=\"button\" id=\"placeOrder\" class=\"cta green mini\" value=\"Place Order\">";
            // add the buttons to the table element
            table.innerHTML += buttons;
            // Bind delete cart button
            app.bindDeleteCartButton();

            // Bind place order button
            app.bindPlaceOrderButton();
        } else {
          var items = responsePayload.items;
          console.log(items);
          // Retrieve each item and add it to a table row
          items.forEach(function(item){
            var table = document.getElementById("checksListTable");
            var tr = table.insertRow(-1);
            tr.classList.add('checkRow');
            var td0 = tr.insertCell(0);
            var td1 = tr.insertCell(1);
            var td2 = tr.insertCell(2);
            var td3 = tr.insertCell(3);
            var td4 = tr.insertCell(4);
            td0.innerHTML = item.id;
            td1.innerHTML = item.name;
            td2.innerHTML = item.price + ' USD';
            td3.innerHTML = "<input type=\"checkbox\" class=\"successCodesInput multiselect\" name=\"items\" value=\""+ item.id+ "\">";
            td4.innerHTML = "<input type=\"text\" id=\"" + item.id + "-update\">"
          });
            var table = document.getElementById("checksListTable");
            var button = "<input type=\"submit\" class=\"cta green\" value=\"Add to Cart\">";
            table.innerHTML += button;
        }
      } else {
        // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  };


// Init (bootstrapping)
app.init = function(){

  // Bind all form submissions
  app.bindForms();

  // Bind logout logout button
  app.bindLogoutButton(); 

  // Get the token from localstorage
  app.getSessionToken();

  // Load data on page
  app.loadDataOnPage();

};

// Call the init processes after the window loads
window.onload = function(){
  app.init();
};