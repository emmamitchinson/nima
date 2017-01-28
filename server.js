var app = require('express')();
var bodyParser  = require('body-parser');
var request = require('request');
var apis = require('./api');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));


/* General conversation */
var BOT_RESPONSES  = {
    RESET : 'Lets do a fresh start...',
    GREETING  : 'Hi, ',
    GREETING_POST  : ' nice to see you here :)',
    LOCATION     : 'So...tell me your postcode, or send me your location to help you out',
    THANKS : "Thank you",
    SEARCH_OPTIONS: "Thank you!!! Now I can find for you the nearest...",
    ERROR : 'Sorry, you explain yourself very bad...'
};

var BOT_STATUS = {
    NEED_LOCATION : 1,
    MENU : 2
};

var BOT_SEARCH_OPTIONS = {
    HOSPITALS: 'Hospitals',
    PHARMACIES: 'Pharmacy',
    GPS: 'GP'
};



/* GET - GENERAL PROPERTIES */

var port = process.env.PORT || 8080;
var token = "EAAESs7ymteEBAHQrZC3y2RQrXswMilWUGjPZBNyIuMVndVgBktVMSbRzEEkWPdnQXvRXdOCPxNDDfRzQ2lo9yXUyYx2y4jFPX3wDSw8yZBSNUX7MtTKB207imhW29ofQUSuFZAacf0ok417RHQZB40JZAkf1lAMO0FvAbdck1XrwZDZD";
var secret = "nimaInHackathon";
var status = BOT_STATUS.NEED_LOCATION;
var lat = 0;
var lng = 0;
var currentLang = null;

exports.token = token;

/* GENERAL methods */

app.listen(port, function () {
    console.log('The webhook is running on port ' + port);
});

/* GET - GENERAL WEBHOOK */

app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === secret) {
    res.send(req.query['hub.challenge']);
  }
  res.send('Error, wrong validation token');
});

app.get('/', function (req, res) {
    res.sendStatus(200);
});

app.post('/webhook/', function (req, res) {

    //RED ALERT CODE!
    /*
    messaging_events = req.body.entry[0].messaging;
    for (i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;
        sayError(sender,BOT_STATUS.NEED_LOCATION,res);
    }
    return;
    */
    messaging_events = req.body.entry[0].messaging;
    for (i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        console.log(`Current status: ${status}`);

        switch (status) {
            case BOT_STATUS.NEED_LOCATION:
                handleNeedLocation(event, sender, req,res);
                break;
            case BOT_STATUS.MENU:
                handleMenu(event, sender, req,res);
                break;
            default:
                sayError(sender,BOT_STATUS.NEED_LOCATION,res);
                break;
        }

    }
});

function handleNeedLanguage(sender, res) {
  // ask for langauge or default to english
  // set language
  try {
    console.log('Attempting to get language');
    currentLang = 'English';
    replyToSender(sender, `We've set your langauge to ${currentLang}`);
    sayLocationNeeded(sender, BOT_STATUS.NEED_LOCATION, res);
    return;
  } catch(e) {
    status = BOT_STATUS.NEED_LOCATION;
    lang = 'English';
    replyToSender(sender, `We've set your langauge to ${lang}`);
    res.sendStatus(200);
  }
}

function handleNeedLocation(event, sender, req,res) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        //Attachments LAT - LONG
        if (event.message.attachments != undefined && event.message.attachments.length > 0 && event.message.attachments[0]['type'] == ['location'] && event.message.attachments[0].payload.coordinates.lat && event.message.attachments[0].payload.coordinates.long) {
            lat = event.message.attachments[0].payload.coordinates.lat;
            lng = event.message.attachments[0].payload.coordinates.long;
            console.log("******** ATTACHMENT MSG RECEIVED");
            saySearchOptions(sender,BOT_STATUS.MENU,res);
        } else {
            if (event.message && event.message.text) {
                text = event.message.text.toLowerCase();
                switch (text) {
                    case "hi":
                    case "hello":
                    case "hey":
                        sayLocationNeeded(sender, BOT_STATUS.NEED_LOCATION,res);
                        break;
                    case "w106hs":
                        //api to get lat lng from postcode
                        apis.getLatLngFromPostcode(text, function (latitude,longitude) {
                            lat = latitude;
                            lng = longitude;
                            console.log("Coordinates "+ lat + "," + lng);
                            saySearchOptions(sender,BOT_STATUS.MENU,res);
                        });
                        break;
                    default:
                        sayError(sender, BOT_STATUS.NEED_LOCATION, res);
                        break;
                }
            } else {
                sayError(sender, BOT_STATUS.NEED_LOCATION, res);
            }
        }
}

function handleMenu(event, sender, req,res) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        //Attachments LAT - LONG
        if (event.message.attachments != undefined && event.message.attachments.length > 0 && event.message.attachments[0]['type'] == ['location'] && event.message.attachments[0].payload.coordinates.lat && event.message.attachments[0].payload.coordinates.long) {
            console.log("******** ATTACHMENT MSG RECEIVED");
            lat = event.message.attachments[0].payload.coordinates.lat;
            lng = event.message.attachments[0].payload.coordinates.long;
            saySearchOptions(sender,BOT_STATUS.MENU,res);
        } else {
            if (event.message && event.message.text) {
                text = event.message.text.toLowerCase();
                switch (text) {
                    case "reset":
                        sayReset(sender,res);
                        break;

                    case BOT_SEARCH_OPTIONS.HOSPITALS.toLowerCase():
                        apis.getNHSFacility(apis.searchTypes.HOSPITALS,lat,lng,function(name){
                            replyToSender(sender,name);
                            res.sendStatus(200);
                        });
                        break;
                    case BOT_SEARCH_OPTIONS.PHARMACIES.toLowerCase():
                        apis.getNHSFacility(apis.searchTypes.PHARMACIES,lat,lng,function(name){
                            replyToSender(sender,name);
                            res.sendStatus(200);
                        });
                        break;
                    case BOT_SEARCH_OPTIONS.GPS.toLowerCase():
                        apis.getNHSFacility(apis.searchTypes.GPS,lat,lng,function(name){
                            replyToSender(sender,name);
                            res.sendStatus(200);
                        });
                        break;

                    case "hi":
                    case "hello":
                    case "hey":
                        saySearchOptions(sender,BOT_STATUS.MENU,res);
                        break;
                    default:
                        sayError(sender, BOT_STATUS.MENU, res);
                        break;
                }
            }
            else {
                //error
                sayError(sender, BOT_STATUS.MENU, res);
            }
        }
}

/* General methods */

function sayLocationNeeded(sender, nextStatus, res) {
    console.log("******** GREETING MSG RECEIVED");
    console.log(`The current lang is - ${currentLang}`)
    apis.getUserName(sender, function (firstName) {
        replyToSender(sender, BOT_RESPONSES.GREETING + firstName + BOT_RESPONSES.GREETING_POST);
        setTimeout(function () {
            if (currentLang === null) {
                handleNeedLanguage(sender, res);
            } else {
              replyToSenderWithLocation(sender,BOT_RESPONSES.LOCATION);
              status = nextStatus;
              res.sendStatus(200);
            }
        }, 1000);
    })
}

function sayThanks(sender, nextStatus, res) {
    replyToSender(sender, BOT_RESPONSES.THANKS);
    status = nextStatus;
    res.sendStatus(200);
}

function sayError(sender, nextStatus, res) {
    console.log("******** NO MATCH");
    replyToSender(sender, "That is sooo funny! :D");
    status = nextStatus;
    res.sendStatus(200);
}

function sayReset(sender, res) {
    console.log("******** RESET");
    lat = 0;
    lng = 0;
    status = BOT_STATUS.NEED_LOCATION;
    currentLang = null;
    replyToSender(sender,BOT_RESPONSES.RESET);
    res.sendStatus(200);
}

function saySearchOptions(sender, nextStatus, res) {
    console.log("******** SHOWING SEARCH OPTIONS");
    status = nextStatus;
    replyToSenderWithSearchOptions(sender, BOT_RESPONSES.SEARCH_OPTIONS);
    res.sendStatus(200);
}

/* SEND - Text */

function replyToSender(sender, text) {
  messageData = {
    text : text
  };
  request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token : token },
      method: 'POST',
      json: {
          recipient: { id : sender },
          message: messageData
      }
  }, function(error, response, body) {
      if (error) {
          console.log('Error sending message: ', error);
      } else if (response.body.error) {
          console.log('Error: ', response.body.error);
      }
  });
}

function replyToSenderWithLocation(sender, text) {
    messageData = {
        "text" : text,
        "quick_replies":[
            {
                "content_type":"location",
            }
        ]
    };
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token : token },
        method: 'POST',
        json: {
            recipient: { id : sender },
            message: messageData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

function replyToSenderWithSearchOptions(sender, text) {
    messageData = {
        "text" : text,
        "quick_replies":[
            {
                "content_type":"text",
                "title":BOT_SEARCH_OPTIONS.HOSPITALS,
                "payload":BOT_SEARCH_OPTIONS.HOSPITALS
            },
            {
                "content_type":"text",
                "title":BOT_SEARCH_OPTIONS.PHARMACIES,
                "payload":BOT_SEARCH_OPTIONS.PHARMACIES
            },
            {
                "content_type":"text",
                "title":BOT_SEARCH_OPTIONS.GPS,
                "payload":BOT_SEARCH_OPTIONS.GPS
            }
        ]
    };
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token : token },
        method: 'POST',
        json: {
            recipient: { id : sender },
            message: messageData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}
