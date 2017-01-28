var app = require('express')();
var bodyParser  = require('body-parser');
var request = require('request');
var server = require('./server');

/* Get Postcode from lat lng */
module.exports.getLatLngFromPostcode = function (postcode, callback) {
    request({
        url: 'https://api.postcodes.io/postcodes/' + postcode,
        qs: {},
        method: 'GET',
        json: {}
    }, function (error, response, body) {
        if (error) {
            console.log('Error getting lat lng: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
        else {
            if (response.body['result'] != undefined)
                callback(response.body['result']['latitude'], response.body['result']['longitude']);
            else
                callback(0, 0);
        }
    });
};

/* Get User name */
module.exports.getUserName = function (sender, callback) {
    request({
        url: 'https://graph.facebook.com/v2.6/' + sender + '?fields=first_name,last_name',
        qs: { access_token : server.token },
        method: 'GET',
        json: {}
    }, function(error, response, body) {
        if (error) {
            console.log('Error getting name: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
        else {
            callback(response.body['first_name']);
        }
    });
};

module.exports.getLanguage = function(sender, callback) {
  request({
      url: 'https://graph.facebook.com/v2.6/' + sender + '?fields=id,name,languages',
      qs: { access_token : server.token },
      method: 'GET',
      json: {}
  }, function(error, response, body) {
      if (error) {
          console.log('Error getting name: ', error);
      } else if (response.body.error) {
          console.log('Error: ', response.body.error);
      }
      else {
          callback(response.body);
      }
  });
}
