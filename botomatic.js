/*
 * This script creates a new Bot object for each bot in `config.js`
 * and serves a basic dashboard at ./status/
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
    fs          = require('fs'),
    _           = require('lodash'),
    util        = require('util'),
    format      = util.format,
    bytes       = require('bytes'),
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

function logFormat(tokens, req, res){
    var status = res.statusCode
      , len = parseInt(res.getHeader('Content-Length'), 10)
      , color = 32
      , datetime
      , output = '';

    if (status >= 500) color = 31
    else if (status >= 400) color = 33
    else if (status >= 300) color = 36;

    len = isNaN(len)
      ? ''
      : len = ' - ' + bytes(len);

    reqTime = req._startTime.toString().split(' ').slice(1,5).join(' ');
    resTime = (new Date - req._startTime);

    output = format('\x1b[90m%s %s @ %s%s \x1b[%sm%s\x1b[90m %sms %s\x1b[0m',
      reqTime, req.method, req.get('host'), (req.originalUrl || req.url),
      color, res.statusCode, resTime, len);
    return output;
}

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join (__dirname, 'www' , 'views'));
app.set('view engine', 'jade');
app.use(express.favicon()); //TODO: Make a favicon!
app.use(express.logger({"format": logFormat})); //TODO: Toggle logging?
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('what color is the sky?')); //Do I need this?
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'www', 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

passport.serializeUser(function(user, done) {
    done(null, user.username);
});

passport.deserializeUser(function(username, done) {
    done(null, authUsers[username] );
});

//Authenticate against CONFIG.dashboard.admins:
//TODO: Make second Strategy for users who aren't admins?
passport.use("digest",
  new DigestStrat({ qop: 'auth' },
  function(username, done) {
    user = authUsers[username];
      console.log("Authenticating as:",username);
      if (!user) { return done(null, false); }
      return done(null, user, user.password);
  }
));

//Either route below works to update property values via POST
app.post('/update/',
  freeEdit || passport.authenticate('digest'),
    Server.updateProperties
);

app.post('/update/:handle/:key/',
  freeEdit || passport.authenticate('digest'),
    Server.updateProperties
);

//Some junk for someone visiting the base url
//TODO: Make an actual page here.
app.get('/', function(req, res){
  res.send('<a href="http://github.com/BooDoo/botomatic/">' +
           'I am botomatic</a>');
});

//Present a stringified JSON record of current bot states in browser
app.get('/store/',
  freeStore || passport.authenticate('digest'),
    function(req, res) {
      res.send("<pre>" + JSON.stringify(Bot.storeBots(),null,'  ') + "</pre>");
    }
);

//Provide a downloadable JSON record of current bot states
app.get('/store/bots.json',
  freeStore || passport.authenticate('digest'),
  function(req, res) {
    res.attachment('bots.json');
    res.end(JSON.stringify(Bot.storeBots(), null, '  '), 'utf8');
  }
);

// Dashboard lists bots by name, sorted with active first
app.post('/status/',
  freeView || passport.authenticate('digest'),
    function(req, res) {
      status.index.call(this, req, res,
        Server.botsWithState()
      );
    }
);

// Listing of properties for a particular active bot
app.post('/status/:handle/',
  freeView || passport.authenticate('digest'),
    function(req, res) {
      status.properties.call(this, req, res,
        Server.propertiesWithState(req.params.handle)
      );
    }
);

// Stringified representation of chosen property for a given bot
app.post('/status/:handle/:key/',
  freeView || passport.authenticate('digest'),
    function(req, res) {
      status.target.call(this, req, res,
        Server.parseTarget(req.params.handle, req.params.key)
      );
    }
);

// Dashboard lists bots by name, sorted with active first
app.get('/status/',
  freeView || passport.authenticate('digest'),
    function(req, res) {
      status.index.call(this, req, res,
        Server.botsWithState()
      );
    }
);

// Listing of properties for a particular active bot
app.get('/status/:handle/',
  freeView || passport.authenticate('digest'),
    function(req, res) {
      status.index.call(this, req, res,
        Server.botsWithState(),
        Server.propertiesWithState(req.params.handle)
      );
    }
);

// Stringified representation of chosen property for a given bot
app.get('/status/:handle/:key/',
  freeView || passport.authenticate('digest'),
    function(req, res) {
      status.index.call(this, req, res,
        Server.botsWithState(),
        Server.propertiesWithState(req.params.handle),
        Server.parseTarget(req.params.handle, req.params.key)
      );
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
    setTimeout(function(botConfig, botState) {
      new Bot(botConfig, botState);
    }, stagger, botConfigs[botHandle], botStates[botHandle]);

    stagger = botConfigs[botHandle].interval / 2;
  }

})(CONFIG.bots);
