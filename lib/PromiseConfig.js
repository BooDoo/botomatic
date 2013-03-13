var utils = require('./utils.js'),
    _ = require('lodash');


function PromiseConfig(promiseOptions, forceNew) {
  if (!forceNew && typeof promiseOptions !== 'undefined' && promiseOptions !== null) {
    var handle = promiseOptions.handle || promiseOptions; //take object with handle property, or just a string
    if (typeof handle === 'string' && typeof PromiseConfig.cache[handle] !== 'undefined') { 
      return PromiseConfig.cache[handle];
    }
  }
  
  var that = {},
      promiseDefaults = PromiseConfig.cache.promiseDefaults,
      p;
  
  for (p in promiseDefaults) {
    that[p] = promiseDefaults[p]; 
  }
  
  for (p in promiseOptions) {
    that[p] = promiseOptions[p];
  }
  
  PromiseConfig.cache[that.handle] = that;
  return that;
}

PromiseConfig.cache = {};

PromiseConfig.cache.promiseDefaults = {
    handle:       "promiseDefaults",
    validate:     function(error, response, body) {
                    return (!error && response.statusCode === 200);
                  },
    processBody:  function(body) {
                    if (typeof body !== 'object') {
                      try {
                        console.log('Parsing body to JSON object...');
                        body = JSON.parse(body);
                      }
                      catch(err) {
                        console.log("Tried to parse JSON, failed. Returning body");
                      }
                    }
                    return body;
                  },
  
    onError:    function(error, response, body) {
                  return (error || "Rejected. (failed validation?)"); 
                }
};

//Not used - TODO: figure out passing in pool/bot via generic function
/*
PromiseConfig.cache.randomWordsOptions = 
{
  validate:     PromiseConfig('promiseDefaults').validate,
  processBody:  function(body) {
                  if (typeof body !== 'object') {
                    try {
                      body = JSON.parse(body);
                    }
                    catch(err) {
                      console.log("Tried to parse JSON, failed. Returning body");
                    }
                  }
                  return {"list": body, "pool": pool, "bot": bot};
                },
  onError:      PromiseConfig('promiseDefaults').onError
};
*/

//Not used: retired chartLyricsAPI
/*
PromiseConfig.cache.chartLyricsAPI = {
  handle:       "chartLyricsAPI",
  failRE:       /<Lyric \/>/,
  goodRE:       /<Lyric>([\s\S]+?)<\/Lyric>/,
  stripRE:      /<.+>/g,
  processBody:  function(body) {
                  return body.match(this.goodRE)[0]
                        .replace(this.stripRE,'')
                        .trim ()
                        .split('\n');
                },
  validate:     function(error, response, body) {
                  return (!error && response.statusCode === 200 && !(this.failRE.test(body)) );
                },
  onError:      PromiseConfig('promiseDefaults').onError
};
*/

PromiseConfig.cache.ohhlaSong  = PromiseConfig({
  handle:       "ohhlaSong",
  failRE:       /<title>.+Rap Geniuses.+<\/title>/i,
  targetRE:     /<pre>[\s\S]+<\/pre>/i,
  stripRE:      /<.+?>|^Typed by:.+$|^Artist:.+$|^Album:.+$|^Song:.+$/gmi,
  processBody:  function(body) {
                  var lyrics;
                  try {
                    //Extract the <pre></pre> contents (lyrics)
                    lyrics = body.match(this.targetRE)[0];
                  }
                  catch(err) {
                    //Sometimes we're given a straight TXT file with no HTML wrapper, so...
                    lyrics = body;
                  }
                  return lyrics.replace(this.stripRE,'')
                        .trim()
                        .split('\n');
                },
  validate:     function(error, response, body) {
                  return (!error && response.statusCode === 200 && !(this.failRE.test(body)) );
                }//,
  //onError:      PromiseConfig('promiseDefaults').onError
});

PromiseConfig.cache.ohhlaList = PromiseConfig({
  handle:       "ohhlaList",
  failRE:       /<title>.+Rap Geniuses.+<\/title>/i,
  targetRE:     /".+?\.txt"/gi,
  stripRE:      /"|http:\/\/ohhla.com\//gi,
  processBody:  function(body) {
                  var relativePath = utils.randomFromArray(body.match(this.targetRE))
                                    .replace(this.stripRE,'')
                                    .trim ();
                  //console.log('Returning', 'http://ohhla.com/' + relativePath, 'from randomTopOhhla...')
                  return 'http://ohhla.com/' + relativePath;
                },
  validate:     function(error, response, body) {
                  return (!error && response.statusCode === 200 && !(this.failRE.test(body)) );
                }//,
  //onError:      PromiseConfig('promiseDefaults').onError
});

PromiseConfig.cache.ohhlaFaves = PromiseConfig({
  handle:       "ohhlaFaves",
  targetRE:     /"YFA_.+?\.html"/gi,
  failRE:       PromiseConfig('ohhlaList').failRE,
  stripRE:      PromiseConfig('ohhlaList').stripRE,
  processBody:  PromiseConfig('ohhlaList').processBody,
  validate:     PromiseConfig('ohhlaList').validate,
  onError:      PromiseConfig('ohhlaList').onError
});

PromiseConfig.cache.cowboyIndex = PromiseConfig({
  handle:       "cowboyIndex",
  targetRE:     /href="lyrics\/.+?"/gi,
  basePath:     "http://www.cowboylyrics.com/",
  stripRE:      /"|href=/gi,
  processBody:  function(body) {
                  try {
                    var artistLinks = body.match(this.targetRE),
                        relativePath;
                        relativePath = utils.randomFromArray(artistLinks).replace(this.stripRE,'');
                    return "http://www.cowboylyrics.com/" + relativePath;
                  }
                  catch (e) {
                    console.log("Can't parse cowboyIndex:",e,"\nRetry",arguments.callee.caller.name,"maybe?");
                    return;
                  }
                }
});

PromiseConfig.cache.cowboyArtist = PromiseConfig({
  handle:       "cowboyArtist",
  targetRE:     /href="(?!http)[^\.]+?\/.+?\.html"/gi,
  basePath:     "http://www.cowboylyrics.com/lyrics/",
  stripRE:      PromiseConfig('cowboyIndex').stripRE,
  processBody:  PromiseConfig('cowboyIndex').processBody//,
  //validate:     PromiseConfig('promiseDefaults').validate,
  //onError:      PromiseConfig('promiseDefaults').onError
});

PromiseConfig.cache.cowboySong = PromiseConfig({
  handle:       "cowboySong",
  targetRE:     /br>[\s\S]+?</gi,
  stripRE:      /br>|<|\n/gi,
  junkRE:       /^\[|^[\W\D]$|google_ad|Ringtone to your cell|Watch.+lesson$|DoubleClick|^Artist:|^Song:|^Album:|nbsp|href/gi,
  processBody:  function (body) {
                  var textArr = body.match(this.targetRE),
                      fullLyric = [];
                    
                  _.each(textArr, function(el, ind, arr) {
                    var text = el.replace(this.stripRE,'').trim();
                    if (text !== '' && !(this.junkRE.test(text)) ) {
                      fullLyric.push(text);
                    }
                  });
                  fullLyric = fullLyric.splice(4, fullLyric.length - 2);
                  return fullLyric;
                }//,
  //validate:     PromiseConfig('promiseDefaults').validate,
  //onError:      PromiseConfig('promiseDefaults').onError
});

exports.PromiseConfig = PromiseConfig;