var request = require('request');
var Twit = require("twit");

var WEATHER_KEY = process.env.WEATHER_KEY;
var CONSUMER_KEY = process.env.ZIPTEMP_CONSUMER_KEY;
var CONSUMER_SECRET = process.env.ZIPTEMP_CONSUMER_SECRET;
var ACCESS_TOKEN = process.env.ZIPTEMP_ACCESS_TOKEN;
var ACCESS_TOKEN_SECRET = process.env.ZIPTEMP_ACCESS_TOKEN_SECRET;

if (!CONSUMER_KEY || ! CONSUMER_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
  console.error("You failed to provide the expected environment configuration variables.")
}

var T = new Twit({
  consumer_key: CONSUMER_KEY,
  consumer_secret: CONSUMER_SECRET,
  access_token: ACCESS_TOKEN,
  access_token_secret: ACCESS_TOKEN_SECRET
});

var handlers = {
  error: function(tweet, payload) {

  },
  lookup: function(tweet, payload) {
    lookupTempInZipCode(payload, (err, response, body) => {
      if (err) {
        return console.error("error:", err);
      }

      body = JSON.parse(body);
      var source_tweet = tweet.id_str;
      var name = tweet.user.screen_name;

      var degrees = body.main.temp;
      var high = body.main.temp_max;
      var low = body.main.temp_min;
      var flavor = "";
      if (body.weather && body.weather.length > 0) {
        flavor = "with " + body.weather[0].description;
      }
      var city = body.name;

      var reply = "@" + name + " It's currently " + degrees + "°F " + flavor + " in " + city + ".";
      T.post('statuses/update', {in_reply_to_status_id: source_tweet, status: reply}, function(err, data, response) {
        if (err) { console.error(err); }
        else {console.log("[" + payload + "] - [" + reply + "]")};
      });
    });
  },
  subscribe: function(tweet, payload) {
    var name = tweet.user.screen_name;
    console.log("[subscribe] " + name + " subscribed to " + payload);
  },
  unsubscribe: function(tweet, payload) {
    var name = tweet.user.screen_name;
    console.log("[unsubscribe] " + name + " unsubscribed from " + payload);
  }
}

var stream = T.stream('statuses/filter', { track: '@ziptemp' });
stream.on('tweet', function(tweet) {
  // returns {type: ..., payload: ...}
  var commands = parseCommand(tweet.text);

  commands.forEach(function(command) {
    var handler = handlers[command.type];
    handler(tweet, command.payload);
  });
});

function lookupTempInZipCode(zipCode, callback) {
  request("http://api.openweathermap.org/data/2.5/weather?zip=" + zipCode + ",us&units=imperial&appid=" + WEATHER_KEY, callback);
}

function parseCommand(text) {
  var tokens = text.split(" ").reduce(function(acc, value) {
    if (/(^\d{5}$)|(^\d{5}-\d{4}$)/.test(value)) { acc.zipcodes.push(value); }
    if (value === "subscribe") { acc.subscribe = true; }
    if (value === "unsubscribe") { acc.unsubscribe = true; }

    return acc;
  }, {zipcodes: [], subscribe: false, unsubscribe: false});

  if (tokens.subscribe && tokens.unsubscribe) {
    return [{type: "error", payload: "can't both subscribe and unsubscribe at once." }];
  }

  if (tokens.subscribe) {
    return tokens.zipcodes.map(function(zipcode) {
      return {type: "subscribe", payload: zipcode};
    })
  } else if (tokens.unsubscribe) {
    return tokens.zipcodes.map(function(zipcode) {
      return {type: "unsubscribe", payload: zipcode};
    })
  } else {
    return tokens.zipcodes.map(function(zipcode) {
      return {type: "lookup", payload: zipcode};
    })
  }
}
