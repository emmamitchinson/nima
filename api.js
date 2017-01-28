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

/**
 * Request langauge from Facebook Graph
 * @param  {[type]}   sender   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
module.exports.getLanguage = function(sender, callback, errorCallback) {
  request({
      url: 'https://graph.facebook.com/v2.6/' + sender + '?fields=id,name,languages',
      qs: { access_token : server.token },
      method: 'GET',
      json: {}
  }, function(error, response, body) {
      if (error) {
        console.log('in error callback')
        errorCallback(error);
      }
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

/* Get nearest nhs facility details for menu */
module.exports.getNHSFacility = function (type, lat, lng, callback) {
    request({
        url: 'https://www.data.gov.uk/data/api/service/health/'+type+'/nearest?lat='+lat+'&lon='+lng,
        qs: {},
        method: 'GET',
        json: {}
    }, function(error, response, body) {
        if (error) {
            console.log('Error getting nhs facility: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
        else {
            callback(response.body['result']['name']);
        }
    });
};
