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
    fs          = require('fs'),
    _           = require('lodash'),
    Bot         = require('./lib/Bot.js'),
    Server      = require('./lib/Server.js'),
    updateSecret= process.env.UPDATE_SECRET,
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
app.use(app.router);
app.use(express.static(path.join(__dirname, 'www', 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.post('/update/', function (req, res) {
  if (req.body.secret !== updateSecret) {
    res.send("You are not authorized to perform that action",403);
    return -1;
  }
  Server.updateProperties(req, res);
});

app.post('/update/:handle/:key/', function (req, res) {
  if (req.body.secret !== updateSecret) {
    res.send("You are not authorized to perform that action",403);
    return -1;
  }
  Server.updateProperties(req, res);
});

//Some junk for someone visiting the base url
app.get('/', function(req, res){
  res.send('IGNORE ME.<br /><br />' +
  '<a href="http://github.com/BooDoo/botomatic/tree/gcatpix">' +
  'I am botomatic</a>');
});

app.get('/store/', function(req, res) {
  res.send("<pre>" + JSON.stringify(Bot.storeBots(),null,'  ') + "</pre>");
});

app.get('/store/bots.json', function(req, res) {
  res.attachment('bots.json');
  res.end(JSON.stringify(Bot.storeBots(), null, '  '), 'utf8');
});

// Dashboard lists bots by name, sorted with active first
// NOT UESD BY POST?
app.post('/status/', function(req, res) {
  status.index.call(this, req, res,
    Server.botsWithState()
  );
});

// Listing of properties for a particular active bot
app.post('/status/:handle/', function(req, res) {
  status.properties.call(this, req, res,
    Server.propertiesWithState(req.params.handle)
  );
});

// Stringified representation of chosen property for a given bot
app.post('/status/:handle/:key/',  function(req, res) {
  status.target.call(this, req, res,
    Server.parseTarget(req.params.handle, req.params.key)
  );
});

// Dashboard lists bots by name, sorted with active first
app.get('/status/', function(req, res) {
  status.index.call(this, req, res,
    Server.botsWithState()
  );
});

// Listing of properties for a particular active bot
app.get('/status/:handle/', function(req, res) {
  status.index.call(this, req, res,
    Server.botsWithState(),
    Server.propertiesWithState(req.params.handle)
  );
});

// Stringified representation of chosen property for a given bot
app.get('/status/:handle/:key/',  function(req, res) {
  status.index.call(this, req, res,
    Server.botsWithState(),
    Server.propertiesWithState(req.params.handle),
    Server.parseTarget(req.params.handle, req.params.key)
  );
});

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
