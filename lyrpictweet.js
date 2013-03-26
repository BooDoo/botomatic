/*
This node application extracts a random tweet-size lyric (preferably rhyming) from one of specified songs on ChartLyrics, 
pairs it with a random image from Flickr, and then tweets the result.

by Joel McCoy (@BooDooPerson)

Phonemes for rhyming are taken from the CMU Pronouncing Dictionary, made avaiable as node-cmudict by Nathaniel K Smith.
express is used as a placeholder server for fielding HTTP requests. (required by NodeJitsu)
node-restclient is used for making calls to Flickr and YQL.
Originally built atop Darius Kazemi's Metaphor-a-Minute.

Currently used for Twitter bots @GCatPix and @CWDogPix.

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