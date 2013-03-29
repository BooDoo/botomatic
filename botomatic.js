/*
This script will create a new Bot object for each bot outlined in `config.js`
Currently used for Twitter bots @GCatPix, @CWDogPix, @Lyrpic, @ct_races and @xyisx_bot

*/

var CONFIG      = require('./config.js'),
    express     = require('express'),
    app         = express(),
    Bot         = require('./lib/Bot.js');

// This is present for deployment to nodejitsu, which requires some response to http call.
app.get('/', function(req, res){
    res.send('IGNORE ME.');
});
app.listen(process.env.PORT || 3000);

//The cmudict module takes ~2sec on initial query; let's get that out of the way now.
//cmudict.get('initialize');


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