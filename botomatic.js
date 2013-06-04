/*
This script will create a new Bot object for each bot outlined in `config.js`
Currently used for Twitter bots @LatourAndOrder, @GCatPix, @CWDogPix, @ct_races and @xyisx_bot
*/

var CONFIG      = require('./config.js'),
    express     = require('express'),
    app         = express(),
    _           = require('lodash'),
    Bot         = require('./lib/Bot.js');

// This is present for deployment to nodejitsu, which requires some response to http call.
app.get('/', function(req, res){
    res.send('IGNORE ME.<br /><br /><a href="http://github.com/BooDoo/botomatic/tree/gcatpix">I am botomatic</a>');
    //res.send(JSON.stringify(_.keys(Bot.bots),null,2));
});

//TODO: Render each Bot.bots handle/bot.key as clickable link!
app.get('/status', function(req, res) {
    //res.send(JSON.stringify(req.query,null,2));
    var handle = req.query.handle || "undefined",
        key = req.query.key || "undefined";

    if (key !== "undefined" && handle !== "undefined") {
      console.log("Fetching info for Bot.bots[" + handle + "]." + key);
      res.send(JSON.stringify(Bot.bots[handle][key],null,2));
    }
    else if (handle !== "undefined") {
      console.log("Fetching info for Bot.bots[" + handle + "]");
      res.send(JSON.stringify(_.keys(Bot.bots[handle]),null,2));
    } else {
      console.log("Fetching list of Bot.bots handles");
      res.send(JSON.stringify(_.keys(Bot.bots),null,2));
    }
});

app.listen(process.env.PORT || 3000);

//Immediate function to construct bots and make setInterval calls:
(function (botConfigs) {
  var botHandle = '',
      stagger = 0;

  for (botHandle in botConfigs) {
    setTimeout(function(botConfig) {
      new Bot(botConfig);
    }, stagger, botConfigs[botHandle]);

    stagger = botConfigs[botHandle].interval / 2;
  }

})(CONFIG.bots);
