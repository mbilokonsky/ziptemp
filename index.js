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

var stream = T.stream('statuses/filter', { track: '@ziptemp' });
stream.on('tweet', function(tweet) {
  var zipcode = tweet.text.split(" ").filter(text => /(^\d{5}$)|(^\d{5}-\d{4}$)/.test(text))[0];

  if (zipcode) {
    lookupTempInZipCode(zipcode, (err, response, body) => {
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
        else {console.log("[" + zipcode + "] - [" + reply + "]")};
      });
    });
  }
});

function lookupTempInZipCode(zipCode, callback) {
  request("http://api.openweathermap.org/data/2.5/weather?zip=" + zipCode + ",us&units=imperial&appid=" + WEATHER_KEY, callback);
}
