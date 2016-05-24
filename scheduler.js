var store = require('./store');
var CronJob = require('cron').CronJob;

function initialize_cron(timezone, publish) {
  return new CronJob(
    '0 0 9 * * *',
    function onTick() {
      console.log("[Scheduler]", "Now firing for " + timezone);
      store.getSubscriptionsByTimezone(timezone, function(err, docs) {
        console.dir(docs);
        console.log("\t" + "found " + docs.length + " subscriptions for timezone.");
        var users_by_zip = docs.reduce(function(acc, val) {
          if (!acc[val.index.zipcode]) {
            acc[val.index.zipcode] = [];
          }

          acc[val.index.zipcode].push({name: val.index.name, subscription_tweet_id: val.subscription_tweet_id});
          return acc;
        }, {});
        console.log("\t", "Sorted into " + Object.keys(users_by_zip).length + " zipcodes.");

        publish(users_by_zip);
      });
    },
    function onComplete() {
      console.log("[Scheduler]", "completed tick for " + timezone);
    },
    true,
    timezone
  );
}

module.exports = {
    initialize: function(publish_subscription) {
      ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "America/Anchorage"].forEach(function(item) {
        initialize_cron(item, publish_subscription);
      })
      console.log("initializing scheduler!");
    }
}
