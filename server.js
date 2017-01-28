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
    ERROR : 'Sorry, you explain yourself very bad...'
};

var BOT_STATUS = {
    NEED_LOCATION : 1,
    MENU : 2
};


/* GET - GENERAL PROPERTIES */

var port = process.env.PORT || 8080;
var token = "EAARoxekgwYcBABRT6k3CmFYUU6lLI7Nz3BnAQmRsgxnHNQeXkmJW6nzIxZBKRmHzZAGPY3o2GLEVZAFq5ujgZB9auNDsSdhQ24sUGAlxGbvEmS35PKUExJRW6ogFDnCPRpzPpzDxqVmiKn9eMoNZBkbx3nE1kH8FnGBoXQHN5HgZDZD";
var status = BOT_STATUS.NEED_LOCATION;
var lat = 0;
var lng = 0;

exports.token = token;

/* GENERAL methods */

app.listen(port, function () {
    console.log('The webhook is running on port ' + port);
});

/* GET - GENERAL WEBHOOK */

app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === '123456') {
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

function handleNeedLocation(event, sender, req,res) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        //Attachments LAT - LONG
        if (event.message.attachments != undefined && event.message.attachments.length > 0 && event.message.attachments[0]['type'] == ['location'] && event.message.attachments[0].payload.coordinates.lat && event.message.attachments[0].payload.coordinates.long) {
            lat = event.message.attachments[0].payload.coordinates.lat;
            lng = event.message.attachments[0].payload.coordinates.long;
            console.log("******** ATTACHMENT MSG RECEIVED");
            status = BOT_STATUS.MENU;
            replyToSender(sender, BOT_RESPONSES.THANKS);
            res.sendStatus(200);
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
                            sayThanks(sender, BOT_STATUS.MENU,res);
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

            status = BOT_STATUS.MENU;
            replyToSender(sender, BOT_RESPONSES.THANKS);
            res.sendStatus(200);
        } else {
            if (event.message && event.message.text) {
                text = event.message.text.toLowerCase();
                switch (text) {
                    case "reset":
                        sayReset(sender,res);
                        break;
                    case "hi":
                    case "hello":
                    case "hey":
                        sayLocationNeeded(sender, BOT_STATUS.MENU,res);
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
    apis.getUserName(sender, function (firstName) {
        replyToSender(sender, BOT_RESPONSES.GREETING + firstName + BOT_RESPONSES.GREETING_POST);
        setTimeout(function () {
            replyToSenderWithLocation(sender,BOT_RESPONSES.LOCATION);
            status = nextStatus;
            res.sendStatus(200);
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
    replyToSender(sender,BOT_RESPONSES.RESET);
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

