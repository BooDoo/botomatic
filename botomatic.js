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
    status      = require('./www/routes/status'),
    http        = require('http'),
    path        = require('path'),
    _           = require('lodash'),
    Bot         = require('./lib/Bot.js'),
    Server      = require('./lib/Server.js'),
    passport    = require('passport'),
    DigestStrat = require('passport-http').DigestStrategy,
    dashSettings= CONFIG.dashboard,
    authUsers   = dashSettings.admins,
    allowAll    = function(req, res, next) {next();},
    freeView    = !dashSettings.protectView   ? allowAll : null,
    freeEdit    = !dashSettings.protectUpdate ? allowAll : null,
    freeStore   = !dashSettings.protectStore  ? allowAll : null,
    botStates   = fs.existsSync('./bots.json') ? JSON.parse(fs.readFileSync('./bots.json', 'utf8')) : false;

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join (__dirname, 'www' , 'views'));
app.set('view engine', 'jade');
app.use(express.favicon()); //TODO: Make a favicon
app.use(express.logger('dev')); //TODO: Toggle logging?
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here')); //Do I need this?
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'www', 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

function botsWithState(handles, activeHandles) {
  handles = handles || _.keys(CONFIG.bots);
  activeHandles = activeHandles || _.keys(Bot.bots);
  var bots = _(handles)
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
  return bots;
}

function propertiesWithState(handle) {
  var bot       = Bot.bots[handle] || CONFIG.bots[handle],
      hideDash  = bot.hideDash,
      properties= _.keys(bot);

  //Filter out hidden properties and any functions.
  //Assume "true" state for all non-hidden properties
  properties = _(properties)
                  .filter(function (v,i,a) {
                    return ( !_.contains(hideDash, v) && !_.isFunction(bot[v]) );
                  })
                  .each(function (v,i,a) {
                    a[i] = {
                      label: v,
                      state: true
                    };
                  })
                  .valueOf();
  return properties;
}

function parseTarget(handle,key,target) {
  var bot = Bot.bots[handle] || CONFIG.bots[handle],
      target = target || bot[key];

  if (_.contains(bot.hideDash, key) || (_.isEmpty(target) && !_.isNumber(target)) ) {
    //Hidden or empty value
    target = "No value stored";
  }
  else {
    //Stringify the object, unless it's a Number or already a String
    if (!_.isNumber(target) && !_.isString(target))
      target = JSON.stringify(target,null,'\t');
  }

  return target;
}

//Some junk for someone visiting the base url
app.get('/', function(req, res){
    res.send('IGNORE ME.<br /><br />' +
    '<a href="http://github.com/BooDoo/botomatic/tree/gcatpix">' +
    'I am botomatic</a>');
});

// Dashboard lists bots by name, sorted with active first
// NOT UESD BY POST?
app.post('/status/', function(req, res) {
  status.index.call(this, req, res,
    botsWithState()
  );
});

// Listing of properties for a particular active bot
app.post('/status/:handle/', function(req, res) {
  status.properties.call(this, req, res, 
    propertiesWithState(req.params.handle)
  );
});

// Stringified representation of chosen property for a given bot
app.post('/status/:handle/:key/',  function(req, res) {
  status.target.call(this, req, res,
    parseTarget(req.params.handle, req.params.key)
  );
});

// Dashboard lists bots by name, sorted with active first
app.get('/status/', function(req, res) {
  status.index.call(this, req, res,
    botsWithState()
  );
});

// Listing of properties for a particular active bot
app.get('/status/:handle/', function(req, res) {
  status.index.call(this, req, res,
    botsWithState(),
    propertiesWithState(req.params.handle)
  );
});

// Stringified representation of chosen property for a given bot
app.get('/status/:handle/:key/',  function(req, res) {
  status.index.call(this, req, res,
    botsWithState(),
    propertiesWithState(req.params.handle),
    parseTarget(req.params.handle, req.params.key)
  );
});

//Provide a downloadable JSON record of current bot states
app.get('/store/bots.json',
  freeStore || passport.authenticate('digest'),
  function(req, res) {
    res.attachment('bots.json');
    res.end(JSON.stringify(Bot.storeBots(), null, '  '), 'utf8');
  }
);

//Immediate function to construct bots and make setInterval calls:
(function (botConfigs) {
  var botHandle = '',
      stagger = 0;

  for (botHandle in botConfigs) {
    setTimeout(function(botConfig, botState) {
      new Bot(botConfig, botState);
    }, stagger, botConfigs[botHandle], botStates[botHandle]);

    stagger = botConfigs[botHandle].interval / 2;
  }

})(CONFIG.bots);
