/*
 * This script creates a new Bot object for each bot in `config.js`
 * and servs a basic dashboard at ./status
 *
 * Currently used for:
 * @LatourAndOrder, @GCatPix, @CWDogPix, @ct_races and @xyisx_bot
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
    res.send('IGNORE ME.<br /><br />' +
    '<a href="http://github.com/BooDoo/botomatic/tree/gcatpix">' +
    'I am botomatic</a>');
});

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Dashboard lists bots by name, sorted with active first
// NOT UESD BY POST?
app.post('/status/', function(req, res) {
  var handles = _.keys(CONFIG.bots),
      activeHandles = _.keys(Bot.bots),
      bots = _(handles)
                .each(function(v, i, a) {
                  a[i] = {
                    label: v,
                    state: _.contains(activeHandles, v)
                  };
                })
                .sortBy(function (v,k,o) {
                  return !v.state;
                })
                .valueOf();

  status.index.call(this, req, res, bots);
});

// Listing of properties for a particular active bot
app.post('/status/:handle/', function(req, res) {
  var handle    = req.params.handle,
      bot       = Bot.bots[handle] || CONFIG.bots[handle],
      keys      = _.keys(bot),
      hideDash  = bot.hideDash,
      states, properties;

  //Filter out hidden properties and any functions.
  keys = _.filter(keys, function(v, i, a) {
    return ( !_.contains(hideDash, v) && !_.isFunction(bot[v]) );
  });

  //states = _.each(Array(keys.length), function (v, i, a) { a[i] = true;}),
  properties = _.each(keys, function(v, i, a) {
                a[i] = {
                  label: v,
                  state: true
                };
              });
  status.properties.call(this, req, res, properties);
});

// Stringified representation of chosen property for a given bot
app.post('/status/:handle/:key/',  function(req, res) {
  var handle = req.params.handle,
      key = req.params.key,
      bot = Bot.bots[handle] || CONFIG.bots[handle],
      target = bot[key];

  if (_.contains(bot.hideDash, key) || (_.isEmpty(target) && !_.isNumber(target)) ) {
    //Hidden or empty value
    status.target.call(this, req, res, "No value stored");
  }
  else {
    //Stringify the object, unless it's a Number or already a String
    if (!_.isNumber(target) && !_.isString(target)) {
      target = JSON.stringify(target,null,'\t');
    }
    status.target.call(this, req, res, target);
  }

});

// Dashboard lists bots by name, sorted with active first
app.get('/status/', function(req, res) {
  var handles = _.keys(CONFIG.bots),
      activeHandles = _.keys(Bot.bots),
      bots = _(handles)
                .each(function(v, i, a) {
                  a[i] = {
                    label: v,
                    state: _.contains(activeHandles, v)
                  };
                })
                .sortBy(function (v,k,o) {
                  return !v.state;
                })
                .valueOf();

  status.index.call(this, req, res, bots);
});

// Listing of properties for a particular active bot
// TODO: REMOVE REDUNDANT CODE!
app.get('/status/:handle/', function(req, res) {
  var handle    = req.params.handle,
      bot       = Bot.bots[handle] || CONFIG.bots[handle],
      handles = _.keys(CONFIG.bots),
      activeHandles = _.keys(Bot.bots),
      bots = _(handles)
                .each(function(v, i, a) {
                  a[i] = {
                    label: v,
                    state: _.contains(activeHandles, v)
                  };
                })
                .sortBy(function (v,k,o) {
                  return !v.state;
                })
                .valueOf();
      keys      = _.keys(bot),
      hideDash  = bot.hideDash,
      properties;

  //Filter out hidden properties and any functions.
  keys = _.filter(keys, function(v, i, a) {
    return ( !_.contains(hideDash, v) && !_.isFunction(bot[v]) );
  });

  properties = _.each(keys, function(v, i, a) {
              a[i] = {
                label: v,
                state: true
              };
            });

  status.index.call(this, req, res, bots, properties);
});

// Stringified representation of chosen property for a given bot
// TODO: REMOVE REDUNDANT CODE!
app.get('/status/:handle/:key/',  function(req, res) {
  var handle = req.params.handle,
      key = req.params.key,
      bot = Bot.bots[handle] || CONFIG.bots[handle],
      handles = _.keys(CONFIG.bots),
      activeHandles = _.keys(Bot.bots),
      bots = _(handles)
                .each(function(v, i, a) {
                  a[i] = {
                    label: v,
                    state: _.contains(activeHandles, v)
                  };
                })
                .sortBy(function (v,k,o) {
                  return !v.state;
                })
                .valueOf();
      keys      = _.keys(bot),
      properties,
      hideDash  = bot.hideDash,
      target = bot[key];

  //Filter out hidden properties and any functions.
  keys = _.filter(keys, function(v, i, a) {
    return ( !_.contains(hideDash, v) && !_.isFunction(bot[v]) );
  });

  properties = _.each(keys, function(v, i, a) {
              a[i] = {
                label: v,
                state: true
              };
            });


  if (_.contains(bot.hideDash, key) !== true) {

    //Stringify the object, unless it's a Number or already a String
    if (!_.isNumber(target) && !_.isString(target)) {
      target = JSON.stringify(target,null,'\t');
    }

    status.object.call(this, req, res, bots, properties, target);
  }
  else {
    status.object.call(this, req, res, bots, properties, "You can't see that property.");
  }
});

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
