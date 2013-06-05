/*
This script will create a new Bot object for each bot outlined in `config.js`
Currently used for Twitter bots @LatourAndOrder, @GCatPix, @CWDogPix, @ct_races and @xyisx_bot
*/

var CONFIG      = require('./config.js'),
    express     = require('express'),
    app         = express(),
    status = require('./www/routes/status'),
    http = require('http'),
    path = require('path'),
    _           = require('lodash'),
    Bot         = require('./lib/Bot.js');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join (__dirname, 'www' , 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'www', 'public')));

//Some junk for someone visiting the base url
app.get('/', function(req, res){
    res.send('IGNORE ME.<br /><br /><a href="http://github.com/BooDoo/botomatic/tree/gcatpix">I am botomatic</a>');
    //res.send(JSON.stringify(_.keys(Bot.bots),null,2));
});

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Dashboard listing running bots by name
app.get('/status/', function(req, res) {
                status.index.call(this, req, res, _.keys(Bot.bots));
             }
);

// Listing of properties for a particular active bot
app.get('/status/:handle/', function(req, res) {
                      var handle    = req.params.handle,
                          bot       = Bot.bots[handle],
                          keys      = _.keys(bot),
                          hideDash  = bot.hideDash;

                      //hideArgs.unshift(keys);
                      keys = _.filter(keys, function(v, k, o) {
                        return (_.contains(hideDash, k) === false && _.isFunction(v) === false)
                      });
                      //keys = _.without.apply(this, hideArgs)
                      status.index.call(this, req, res, keys);
                    }
);

// Stringified representation of chosen property for a given bot
app.get('/status/:handle/:key/',  function(req, res) {
                            var handle = req.params.handle,
                                key = req.params.key,
                                bot = Bot.bots[handle];

                            if (_.contains(bot.hideDash, key) !== true) {
                              status.object.call(this, req, res, JSON.stringify(Bot.bots[handle][key],null,'\t'));
                            }
                            else {
                              status.object.call(this, req, res, "You can't see that property.");
                            }
                          }
);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

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
