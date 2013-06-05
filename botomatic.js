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

// This is present for deployment to nodejitsu, which requires some response to http call.
app.get('/', function(req, res){
    res.send('IGNORE ME.<br /><br /><a href="http://github.com/BooDoo/botomatic/tree/gcatpix">I am botomatic</a>');
    //res.send(JSON.stringify(_.keys(Bot.bots),null,2));
});

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/status/', function(req, res) {
                status.index.call(this, req, res, _.keys(Bot.bots));
             }
);
app.get('/status/:handle/', function(req, res) {
                      var handle = req.params.handle
                      status.index.call(this, req, res, _.keys(Bot.bots[handle]));
                    }
);
//app.get('/users', user.list);

app.get('/status/:handle/:key/',  function(req, res) {
                            var handle = req.params.handle,
                                key = req.params.key;

                            status.object.call(this, req, res, JSON.stringify(Bot.bots[handle][key],null,'\t'));
                          }
);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


/*
app.get('/status', function(req, res) {
    var handle = req.query.handle || "undefined",
        key = req.query.key || "undefined",
        handles, keys,
        output = "";

    if (key !== "undefined" && handle !== "undefined") {
      console.log("Fetching info for Bot.bots[" + handle + "]." + key);
      output = '<pre>' + JSON.stringify(Bot.bots[handle][key],null,'\t') + '</pre>';
    }
    else if (handle !== "undefined") {
      console.log("Fetching info for Bot.bots[" + handle + "]");
      keys = _.keys(Bot.bots[handle]);
      _.each(keys, function (k, i, o) {
        output += '<a href="/status?handle=' + handle + '&key=' + k + '">' + k + '</a><br />';
      });
    } else {
      console.log("Fetching list of Bot.bots handles");
      handles = _.keys(Bot.bots);
      _.each(handles, function (k, i, o) {
        output += '<a href="/status?handle=' + k + '">' + k + '</a><br />';
      });
    }

    res.send(output)
});
*/

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
