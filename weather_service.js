var WEATHER_KEY = process.env.WEATHER_KEY;
var request = require("request");
module.exports = {
  lookupTempInZipCode: function(zipcode, callback) {
    request("http://api.openweathermap.org/data/2.5/weather?zip=" + zipcode + ",us&units=imperial&appid=" + WEATHER_KEY, function(err, response, body) {
      if (err) {
        callback(err);
      }

      body = JSON.parse(body);

      var degrees = body.main.temp;
      var high = body.main.temp_max;
      var low = body.main.temp_min;
      var flavor = "";
      if (body.weather && body.weather.length > 0) {
        flavor = "with " + body.weather[0].description;
      }
      var city = body.name;

      callback(null, "It's currently " + degrees + "°F " + flavor + " in " + city + ".")
    });
  }
}
