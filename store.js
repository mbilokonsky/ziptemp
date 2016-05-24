var DataStore = require("nedb");
var db = new DataStore({filename: "database.db", autoload: true});
var zipcode_to_timezone = require( 'zipcode-to-timezone' );
db.ensureIndex({fieldName: 'index', unique: true});

module.exports = {
  addSubscription: function addSubscription(name, zipcode, subscription_tweet_id, callback) {
    var tz = zipcode_to_timezone.lookup(zipcode);
    var record = {
      index: {
          name: name,
          zipcode: zipcode
      },
      subscription_tweet_id: subscription_tweet_id,
      timezone: tz
    };
    console.log("Inserting record:", record);

    db.insert(record, callback);
  },
  removeSubscription: function removeSubscription(name, zipcode, callback) {
    var tz = zipcode_to_timezone.lookup(zipcode);
    var record = {
      index: {
        name: name,
        zipcode: zipcode
      }
    };

    db.remove(record, callback);
  },
  getSubscriptionsByTimezone: function getSubscriptionsByTimezone(timezone, callback) {
    db.find({timezone: timezone}, callback);
  }
}
