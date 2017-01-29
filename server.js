var app = require('express')();
var bodyParser  = require('body-parser');
var request = require('request');
var apis = require('./api');
var responses = require('./responses');
var humanResponses = require('./human-responses');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var USER_LANG_STATE = [];

var BOT_STATUS = {
    NEED_GREET : 0,
    NEED_LANG : 1,
    LANG_PENDING : 2,
    NEED_LOCATION : 3,
    LOCATION_PENDING: 4,
    MENU : 5
};

var BOT_SEARCH_OPTIONS_MATCH = {
    HOSPITALS: 'hospital',
    PHARMACIES: 'pharmac',
    GPS: 'gp'
};

var BOT_SEARCH_OPTIONS = {
    HOSPITALS: 'Hospitals',
    PHARMACIES: 'Pharmacy',
    GPS: 'GP'
};

var BOT_LANGUAGE_OPTIONS = {
    ENGLISH_UK:'en_GB',
    ENGLISH_US:'en_US',
    ENGLISH: 'English',
    FRANCAIS_FR:'fr_FR',
    FRANCAIS: 'Francais',
    ESPAÑOL_LA: 'es_LA',
    ESPAÑOL: 'Español'
};

var LANGUAGE_CODES = {
  ENGLISH: 'en_GB',
  FRANCAIS: 'fr_FR',
  ESPAÑOL: 'es_LA'
}

var LANGUAGE_PLAIN = {
  'en_GB': 'ENGLISH',
  'fr_FR': 'FRANCAIS',
  'es_LA': 'ESPAÑOL'
}

var app_url_callback = "https://nimabotnhs.herokuapp.com/";


/* GET - GENERAL PROPERTIES */

var port = process.env.PORT || 8080;
var token = "EAAESs7ymteEBAHQrZC3y2RQrXswMilWUGjPZBNyIuMVndVgBktVMSbRzEEkWPdnQXvRXdOCPxNDDfRzQ2lo9yXUyYx2y4jFPX3wDSw8yZBSNUX7MtTKB207imhW29ofQUSuFZAacf0ok417RHQZB40JZAkf1lAMO0FvAbdck1XrwZDZD";
var secret = "nimaInHackathon";
var status = BOT_STATUS.NEED_GREET;
var lat = 0;
var lng = 0;
var currentLang = null;
var askedLangNoLocation = false;

exports.token = token;

/* GENERAL methods */
app.listen(port, function () {
    console.log('The webhook is running on port ' + port);
    showGreetingsMessage(BOT_RESPONSES.INTRODUCTION);
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
    messaging_events = req.body.entry[0].messaging;
    for (i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        console.log(`Current status: ${status}`);
        console.log(`Available states: ${JSON.stringify(BOT_STATUS)}`);
        console.log(`The event value is - ${JSON.stringify(event)}`);
        determineResponse(status, sender, event, res, req);
    }
});

function determineResponse(status, sender, event, res, req) {
  switch (status) {
      case BOT_STATUS.NEED_GREET:
          introductoryGreet(sender, event, res, req);
          break;
      case BOT_STATUS.NEED_LANG:
          sayNeedLanguage(sender, currentLang, res);
          break;
      case BOT_STATUS.LANG_PENDING:
          setLanguageFromQuickReplies(event, sender, res, req);
          break;
      case BOT_STATUS.NEED_LOCATION:
          sayLocationNeeded(sender, BOT_STATUS.LOCATION_PENDING, res);
          break;
      case BOT_STATUS.LOCATION_PENDING:
          handleNeedLocation(event,sender,req,res);
          break;
      case BOT_STATUS.MENU:
          handleMenu(event, sender, req, res);
          break;
      default:
          sayError(sender, BOT_STATUS.NEED_GREET, res);
          break;
  }
}

function determineHumanResponseType(text) {
    if (responses.GREETING.indexOf(text) >= -1) {
        responseType = "GREETING";
    } else if (responses.RUDE.indexOf(text) >= -1) {
        responseType = "RUDE"; 
    } else if (responses.THANKS.indexOf(text) >= -1) {
        responseType = "THANKS"; 
    } else if (responses.RESET_LOCATION.indexOf(text) >= -1) {
        responseType = "RESET"; 
    } else if (responses.RESET_LANGUAGE.indexOf(text) >= -1) {
        responseType = "RESET"; 
    } else {
        responseType = false;
    }

    return responseType;
}

function determineBotResponse(status, responseType, res) {
    switch (responseType) {
        case "RESET"
            sayReset(sender,res);
            break;
        case "GREETING"
            introductoryGreet(sender, event, res, req);
            break;
        case "THANKS"
            replyToSender(sender, "You're welcome! :)");
            break;
        case "RUDE"
            replyToSender(sender, "That's not very nice :(");
            break;
        default:
            break;
}
/* General methods */
function detectLanguage(language) {
    switch (language){
        case BOT_LANGUAGE_OPTIONS.ENGLISH_UK:
            return LANGUAGE_CODES.ENGLISH;
            break;
        case BOT_LANGUAGE_OPTIONS.ENGLISH_US:
            return LANGUAGE_CODES.ENGLISH;
            break;
        case BOT_LANGUAGE_OPTIONS.FRANCAIS_FR:
            return LANGUAGE_CODES.FRANCAIS;
            break;
        case BOT_LANGUAGE_OPTIONS.ESPAÑOL_LA:
            return LANGUAGE_CODES.ESPAÑOL;
            break;
        default:
            return LANGUAGE_CODES.ENGLISH;
            break;
    }
}

function setLanguageFromQuickReplies(event, sender, res, req) {
    if (event.message && event.message.text) {
        text = event.message.text;
        const options = [BOT_LANGUAGE_OPTIONS.ENGLISH, BOT_LANGUAGE_OPTIONS.FRANCAIS, BOT_LANGUAGE_OPTIONS.ESPAÑOL];
        if (options.indexOf(text) != -1) {
            console.log(`Setting language ${text}`);
            currentLang = LANGUAGE_CODES[text.toUpperCase()];
            BOT_RESPONSES = responses[currentLang];
        }
    }

    status = BOT_STATUS.NEED_LOCATION;
    replyToSender(sender, BOT_RESPONSES.LANG_SET + ` ${LANGUAGE_PLAIN[currentLang]}`);
    console.log("******** LANGUAGE CONFIRMATION MSG RECEIVED");
    determineResponse(status, sender, event, res, req);
}

function handleNeedLocation(event, sender, req, res) {
        //Attachments LAT - LONG
        if (event.message.attachments != undefined && event.message.attachments.length > 0 && event.message.attachments[0]['type'] == ['location'] && event.message.attachments[0].payload.coordinates.lat && event.message.attachments[0].payload.coordinates.long) {
            lat = event.message.attachments[0].payload.coordinates.lat;
            lng = event.message.attachments[0].payload.coordinates.long;
            console.log("******** ATTACHMENT MSG RECEIVED");
            saySearchOptions(sender,BOT_STATUS.MENU,res);
        } else {
            if (event.message && event.message.text) {
                text = event.message.text.toLowerCase();
                var responseType = determineHumanResponseType(text);
                if (responseType){
                    return determineBotResponse(status, responseType, res);
                }
                //api to get lat lng from postcode
                apis.getLatLngFromPostcode(text, function (latitude,longitude) {
                    if (latitude != 0 && longitude != 0) {
                        lat = latitude;
                        lng = longitude;
                        saySearchOptions(sender, BOT_STATUS.MENU, res);
                    }
                    else {
                        replyToSender(sender,BOT_RESPONSES.INVALID_POSTCODE);
                        res.sendStatus(200);
                    }
                });
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
        if (event.message && event.message.attachments != undefined && event.message.attachments.length > 0 && event.message.attachments[0]['type'] == ['location'] && event.message.attachments[0].payload.coordinates.lat && event.message.attachments[0].payload.coordinates.long) {
            console.log("******** ATTACHMENT MSG RECEIVED");
            lat = event.message.attachments[0].payload.coordinates.lat;
            lng = event.message.attachments[0].payload.coordinates.long;
            saySearchOptions(sender,BOT_STATUS.MENU,res);
        }else if (event['postback'] && event['postback']['payload']) {
            switch (event['postback']['payload'].toLowerCase()) {
                case BOT_RESPONSES.SEARCH_OPTIONS_REPEAT.toLowerCase():
                    saySearchOptionsAgain(sender,BOT_STATUS.MENU,res);
                    break;
            }
        } else {
            if (event.message && event.message.text) {
                /*
                convert the user response from user langauge to command for the bot to understand
                eg hello or hola or boujour wold convert to user_input_hello
                */
                text = event.message.text.toLowerCase();

                var responseType = determineHumanResponseType(text);
                if (responseType){
                    return determineBotResponse(status, responseType, res);
                }

                if (text.includes(BOT_SEARCH_OPTIONS_MATCH.HOSPITALS.toLowerCase())) {
                    text = BOT_SEARCH_OPTIONS.HOSPITALS.toLowerCase();
                } else if (text.includes(BOT_SEARCH_OPTIONS_MATCH.PHARMACIES.toLowerCase())) {
                    text = BOT_SEARCH_OPTIONS.PHARMACIES.toLowerCase();
                } else if (text.includes(BOT_SEARCH_OPTIONS_MATCH.GPS.toLowerCase())) {
                    text = BOT_SEARCH_OPTIONS.GPS.toLowerCase();
                }

                console.log(text);

                switch (text) {
                    case BOT_SEARCH_OPTIONS.HOSPITALS.toLowerCase():
                        showTyping(true, sender);
                        apis.getNHSFacility(apis.searchTypes.HOSPITALS,lat,lng,function(items){
                            replyToSenderWithCarousel(sender,items);
                            showTyping(false, sender);
                            res.sendStatus(200);
                        });
                        break;
                    case BOT_SEARCH_OPTIONS.PHARMACIES.toLowerCase():
                        showTyping(true, sender);
                        apis.getNHSFacility(apis.searchTypes.PHARMACIES,lat,lng,function(items){
                            replyToSenderWithCarousel(sender,items);
                            showTyping(false, sender);
                            res.sendStatus(200);
                        });
                        break;
                    case BOT_SEARCH_OPTIONS.GPS.toLowerCase():
                        showTyping(true, sender);
                        apis.getNHSFacility(apis.searchTypes.GPS,lat,lng,function(items){
                            replyToSenderWithCarousel(sender,items);
                            showTyping(false, sender);
                            res.sendStatus(200);
                        });
                        break;
                    case BOT_RESPONSES.SEARCH_OPTIONS_REPEAT:
                        saySearchOptionsAgain(sender,BOT_STATUS.MENU,res);
                        break;
                    default:
                        sayError(sender, BOT_STATUS.MENU, res);
                        break;
                }
            }
            else {
                //error
                console.log("EVENT---------", event);
                console.log("REQUEST---------", req);
                sayError(sender, BOT_STATUS.MENU, res);
            }
        }
}

function introductoryGreet(sender, event, res, req) {
    console.log(sender);
    apis.getUserNameAndLang(sender, function (firstName,language) {
        console.log("LOCALE OF USER ", language );
        currentLang = detectLanguage(language);
        BOT_RESPONSES = responses[currentLang];
        console.log(status, currentLang);
        if (!askedLangNoLocation) {
          console.log(currentLang);
          status = BOT_STATUS.NEED_LANG;
        }
        else {
          status = BOT_STATUS.NEED_LOCATION;
        }

        replyToSender(sender, BOT_RESPONSES.GREETING + firstName + BOT_RESPONSES.GREETING_POST);
        determineResponse(status, sender, event, res, req);
        //res.sendStatus(200);
    });
    console.log("******** GREETING MSG RECEIVED");
}

function sayLocationNeeded(sender, nextStatus, res) {
    setTimeout(function () {
          replyToSenderWithLocation(sender,BOT_RESPONSES.LOCATION);
          status = nextStatus;
          res.sendStatus(200);
    }, 1000);
}

function sayNeedLanguage(sender, currentLang, res) {
    try {
        askedLangNoLocation = true;
        console.log('Attempting to get language');
        setTimeout(function() {
            replyToSenderWithLanguages(sender, currentLang);
        }, 1000);
        status = BOT_STATUS.LANG_PENDING;
        res.sendStatus(200);
    } catch(e) {
        status = BOT_STATUS.NEED_LOCATION;
        replyToSender(sender, BOT_RESPONSES.LANG_SET + ` ${currentLang}`);
        console.log("******** LANGUAGE CONFIRMATION MSG RECEIVED");
        res.sendStatus(200);
    }
}

function sayThanks(sender, nextStatus, res) {
    console.log("******** THANKS");
    replyToSender(sender, BOT_RESPONSES.THANKS);
    status = nextStatus;
    res.sendStatus(200);
}

function sayError(sender, nextStatus, res) {
    console.log("******** NO MATCH");
    replyToSender(sender, BOT_RESPONSES.ERROR);
    status = nextStatus;
    res.sendStatus(200);
}

function sayReset(sender, res) {
    console.log("******** RESET");
    lat = 0;
    lng = 0;
    status = BOT_STATUS.NEED_GREET;
    currentLang = null;
    askedLangNoLocation = false;
    replyToSender(sender, BOT_RESPONSES.RESET);
    res.sendStatus(200);
}

function saySearchOptions(sender, nextStatus, res) {
    console.log("******** SHOWING SEARCH OPTIONS");
    status = nextStatus;
    replyToSenderWithSearchOptions(sender, BOT_RESPONSES.SEARCH_OPTIONS);
    res.sendStatus(200);
}

function saySearchOptionsAgain(sender, nextStatus, res) {
    console.log("******** SHOWING SEARCH OPTIONS AGAIN");
    status = nextStatus;
    replyToSenderWithSearchOptions(sender, BOT_RESPONSES.SEARCH_OPTIONS_REPEAT);
    res.sendStatus(200);
}

/* SEND - Text */
function showGreetingsMessage(message) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/thread_settings',
        qs: { access_token : token },
        method: 'POST',
        json: {
            "setting_type":"greeting",
            "greeting":{
                "text": message
            }
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error showing greetings message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

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

function replyToSenderWithLanguages(sender, currentLang) {
    messageData = {
        "text" : BOT_RESPONSES.LANG_SET + ` ${LANGUAGE_PLAIN[currentLang]}` + BOT_RESPONSES.LANG_CHANGE,
        "quick_replies":[
            {
                "content_type": "text",
                "title": BOT_LANGUAGE_OPTIONS.ENGLISH,
                "payload": BOT_LANGUAGE_OPTIONS.ENGLISH
            },
            {
                "content_type": "text",
                "title": BOT_LANGUAGE_OPTIONS.FRANCAIS,
                "payload": BOT_LANGUAGE_OPTIONS.FRANCAIS
            },
            {
                "content_type": "text",
                "title": BOT_LANGUAGE_OPTIONS.ESPAÑOL,
                "payload": BOT_LANGUAGE_OPTIONS.ESPAÑOL
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

function showTyping(flag,sender) {
    typing = "typing_off";
    if (flag == true ) {
        typing = "typing_on";
    }

    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token : token },
        method: 'POST',
        json: {
            recipient: { id : sender },
            sender_action: typing
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error typing: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

function replyToSenderWithCarousel(sender, items) {

    var elements = [];
    items.forEach(function(item){
        var urlAction = {
            "type": "web_url",
            "url": item.website,
            "messenger_extensions": false,
            "webview_height_ratio": "tall"
        };
        var urlButton = {
            "type": "web_url",
            "url": item.website,
            "title": BOT_RESPONSES.WEBSITE
        };
        var mapButton = {
            "type": "web_url",
            "url": "https://maps.google.com/?q="+item.latitude+","+item.longitude,
            "title": BOT_RESPONSES.MAP
        };
        var searchAgainButton = {
            "type": "postback",
            "title": BOT_RESPONSES.SEARCH_AGAIN,
            "payload": BOT_RESPONSES.SEARCH_OPTIONS_REPEAT
        };
        var buttons = [urlButton, mapButton, searchAgainButton];
        var dict = { "title" : item.name, "subtitle" : item.phone ? item.phone : BOT_RESPONSES.NOPHONE , "default_action" : urlAction , "buttons" : buttons };
        elements.push(dict);
        console.log(item);
    });

    messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": elements
            }
        }
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
