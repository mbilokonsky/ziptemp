var request = require('request');
var Twit = require("twit");
var store = require("./store");
var scheduler = require("./scheduler");
var weather_service = require("./weather_service");

var CONSUMER_KEY = process.env.ZIPTEMP_CONSUMER_KEY;
var CONSUMER_SECRET = process.env.ZIPTEMP_CONSUMER_SECRET;
var ACCESS_TOKEN = process.env.ZIPTEMP_ACCESS_TOKEN;
var ACCESS_TOKEN_SECRET = process.env.ZIPTEMP_ACCESS_TOKEN_SECRET;

if (!CONSUMER_KEY || ! CONSUMER_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
  console.error("You failed to provide the expected environment configuration variables.");
}

var T = new Twit({
  consumer_key: CONSUMER_KEY,
  consumer_secret: CONSUMER_SECRET,
  access_token: ACCESS_TOKEN,
  access_token_secret: ACCESS_TOKEN_SECRET
});

function publish(text, in_reply_to) {
  T.post('statuses/update', {in_reply_to_status_id: in_reply_to, status: text}, function(err, data, response) {
    if (err) { console.error(err); }
  });
}

function lookupAndSendWeatherData(username, zipcode, source_tweet) {
  weather_service.lookupTempInZipCode(zipcode, function(err, formattedResponse) {
    var reply = "@" + username + " " + formattedResponse;
    publish(reply, source_tweet);
  });
}

var handlers = {
  error: function(tweet, payload) {

  },
  lookup: function(tweet, zipcode) {
    var source_tweet = tweet.id_str;
    var name = tweet.user.screen_name;
    lookupAndSendWeatherData(name, zipcode, source_tweet);
  },
  subscribe: function(tweet, zipcode) {
    var source_tweet = tweet.id_str;
    var name = tweet.user.screen_name;
    store.addSubscription(name, zipcode, source_tweet, function(err, result) {
      if (err) {
        var reply = "@" + name + " Subscription failed. Try again, maybe? Just say 'subscribe [zipcode]'";
        publish(reply, source_tweet);
        console.warn("[subscribe failed]", tweet.text, err);
      } else {
        var reply = "@" + name + " subscribed to  " + zipcode + ". Tweet 'unsubscribe " + zipcode + "' at me to unsubscribe.";
        publish(reply, source_tweet);
        console.log("[subscribe] " + name + " subscribed to " + zipcode);
      }
    });
  },
  unsubscribe: function(tweet, zipcode) {
    var source_tweet = tweet.id_str;
    var name = tweet.user.screen_name;
    var reply = "";
    store.removeSubscription(name, zipcode, function(err, result) {
      if (err) {
        reply = "@" + name + "Unsubscribe failed. Notifying @mykola to fix it. Stand by.";
      } else {
        reply = "@" + name + " you have unsubsribed from daily updates for " + zipcode + ".";
      }
      publish(reply, source_tweet);
    });
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

scheduler.initialize(function(users_by_zip) {
  console.log("\t", "Now publishing tweets!");
  Object.keys(users_by_zip).forEach(function(zipcode) {
    users_by_zip[zipcode].forEach(function(record) {
      lookupAndSendWeatherData(record.name, zipcode, record.subscription_tweet_id);
    });
  });
})
