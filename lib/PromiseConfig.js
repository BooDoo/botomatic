var utils = require('./utils.js'),
    _ = require('lodash');


function PromiseConfig(promiseOptions, forceNew) {
  if (!forceNew && typeof promiseOptions !== 'undefined' && promiseOptions !== null) {
    var handle = promiseOptions.handle || promiseOptions; //take object with handle property, or just a string
    if (typeof handle === 'string' && typeof PromiseConfig.promiseConfigs[handle] !== 'undefined') {
      return PromiseConfig.promiseConfigs[handle];
    }
  }

  var that = {},
      promiseDefaults = PromiseConfig.promiseConfigs.promiseDefaults,
      p;

  for (p in promiseDefaults) {
    that[p] = promiseDefaults[p];
  }

  for (p in promiseOptions) {
    that[p] = promiseOptions[p];
  }

  PromiseConfig.promiseConfigs[that.handle] = that;
  return that;
}

PromiseConfig.promiseConfigs = {};

PromiseConfig.promiseConfigs.promiseDefaults = {
    handle:       "promiseDefaults",
    validate:     function(error, response, body) {
                    return (!error && response.statusCode === 200);
                  },
    processBody:  function(body) {
                    if (typeof body !== 'object') {
                      try {
                        //console.log('Parsing body to JSON object...');
                        body = JSON.parse(body);
                      }
                      catch(err) {
                        //console.log("Tried to parse JSON, failed. Returning body unparsed");
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
PromiseConfig.promiseConfigs.randomWordsOptions =
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
PromiseConfig.promiseConfigs.chartLyricsAPI = {
  handle:       "chartLyricsAPI",
  failRE:       /<Lyric \/>/,
  goodRE:       /<Lyric>([\s\S]+?)<\/Lyric>/,
  stripRE:      /<.+>|\uFFFD/g,
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

//"twitterSearch" returns text content for eac
PromiseConfig.promiseConfigs.twitterTextOnly = PromiseConfig({
  handle:       "twitterTextOnly",
  processBody:  function(reply) {
                  var tweets = reply.statuses;
                  return _.pluck(tweets, "text");
                }
  //validate:   function(error, response, body)
});

PromiseConfig.promiseConfigs.wordnikPartOfSpeech = PromiseConfig({
  handle:       "wordnikPartOfSpeech",
  processBody:  function(res) {
                  res = JSON.parse(res);
                  return _(res).pluck("partOfSpeech").unique().value().join(",");
                },
  validate:     function(error, response, body) {
                  //console.log("wordnikPOS validate:\n\tresponse:",response,"\n\tbody:",body);
                  return !_.isEmpty(body);
                }
});

//TODO: Use me!
PromiseConfig.promiseConfigs.wordnikPhrasePres = PromiseConfig({
  handle:       "wordnikPhrasePres",
  processBody:  function(res) {
                  res = JSON.parse(res);
                  //console.log("Phrases returned:", res.length);
                  var stripRE = /^(?:the|a|an|and|or|no[tn]?|your?|my|theirs?|ours?|his|her|it|it'?s|this|that|these|one|very|those|own|.+'(?:'s|re|d)||each|every|on|of|be|was|re|were)$/ig;
                  return _(res).pluck("gram1").unique()
                    .filter(function (gram, i, a) {
                      //gram.match(stripRE) ? console.log("Found a gram to strip out:",gram) : null;
                      return !gram.match(stripRE);
                    })
                    .each(function (gram, i, a) {
                      a[i] = gram.toLowerCase();
                    })
                    .valueOf();
                },
  validate:     function(error, response, body) {
                  //console.log("wordnikPOS validate:\n\tresponse:",response,"\n\tbody:",body);
                  return !_.isEmpty(body);
                }
});

PromiseConfig.promiseConfigs.wordnikCrossReferences = PromiseConfig({

  handle:       "wordnikCrossReferences",
  processBody:  function(res) {
                  return JSON.parse(res).words;
                },
  validate:     function() {
                  return !_.isEmpty(body);
                }
});

PromiseConfig.promiseConfigs.wordnikRandomWords = PromiseConfig({
  handle:       "wordnikRandomWords",
  processBody:  function(body) {
                  return _.pluck(JSON.parse(body), "word")
                }
});


PromiseConfig.promiseConfigs.ohhlaSong  = PromiseConfig({
  handle:       "ohhlaSong",
  failRE:       /<title>.+Rap Geniuses.+<\/title>/i,
  targetRE:     /<pre>[\s\S]+<\/pre>/i,
  stripRE:      /<.+?>|^Typed by:.+$|^Artist:.+$|^Album:.+$|^Song:.+$|\uFFFD/gmi,
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
//onError:    PromiseConfig('promiseDefaults').onError
});

PromiseConfig.promiseConfigs.ohhlaList = PromiseConfig({
  handle:       "ohhlaList",
  failRE:       /<title>.+Rap Geniuses.+<\/title>/i,
  targetRE:     /".+?\.txt"/gi,
  stripRE:      /"|http:\/\/ohhla.com\/|\uFFFD/gi,
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

PromiseConfig.promiseConfigs.ohhlaFaves = PromiseConfig({
  handle:       "ohhlaFaves",
  targetRE:     /"YFA_.+?\.html"/gi,
  failRE:       PromiseConfig('ohhlaList').failRE,
  stripRE:      PromiseConfig('ohhlaList').stripRE,
  processBody:  PromiseConfig('ohhlaList').processBody,
  validate:     PromiseConfig('ohhlaList').validate,
  onError:      PromiseConfig('ohhlaList').onError
});

PromiseConfig.promiseConfigs.cowboyIndex = PromiseConfig({
  handle:       "cowboyIndex",
  targetRE:     /href="lyrics\/.+?"/gi,
  basePath:     "http://www.cowboylyrics.com/",
  stripRE:      /"|href=|\uFFFD/gi,
  processBody:  function(body) {
                  try {
                    var artistLinks = body.match(this.targetRE),
                        relativePath;
                        relativePath = utils.randomFromArray(artistLinks).replace(this.stripRE,'');
                    return this.basePath + relativePath;
                  }
                  catch (e) {
                    console.log("Can't parse site index:",e);
                    return;
                  }
                }
});

PromiseConfig.promiseConfigs.cowboyArtist = PromiseConfig({
  handle:       "cowboyArtist",
  targetRE:     /href="(?!http)[^\.]+?\/.+?\.html"/gi,
  basePath:     "http://www.cowboylyrics.com/lyrics/",
  stripRE:      PromiseConfig('cowboyIndex').stripRE,
  processBody:  PromiseConfig('cowboyIndex').processBody
});

PromiseConfig.promiseConfigs.cowboySong = PromiseConfig({
  handle:       "cowboySong",
  targetRE:     /br>[\s\S]+?</gi,
  stripRE:      /br>|<|\n|\uFFFD/gi,
  junkRE:       /^\[|^[\W\D]$|google_ad|Ringtone to your cell|Watch.+lesson$|DoubleClick|^Artist:|^Song:|^Album:|nbsp|href/gi,
  processBody:  function (body) {
                  var self = this,
                      textArr = body.match(this.targetRE),
                      fullLyric = [];

                  _.each(textArr, function(el, ind, arr) {
                    var text = el.replace(self.stripRE,'').trim();
                    if (text !== '' && !(self.junkRE.test(text)) ) {
                      fullLyric.push(text);
                    }
                  });
                  fullLyric = fullLyric.splice(4, fullLyric.length - 2);
                  return fullLyric;
                }
});

PromiseConfig.promiseConfigs.azIndex = PromiseConfig({
  handle:       "azIndex",
  targetRE:     /href="\w\/.+?.html"/gi,
  stripRE:      /"|href=|\uFFFD/gi,
  basePath:     "http://www.azlyrics.com/",
  processBody:  PromiseConfig('cowboyIndex').processBody
});


PromiseConfig.promiseConfigs.azArtist = PromiseConfig({
  handle:       "azArtist",
  targetRE:     /href="\.\.\/lyrics\/.+?.html"/gi,
  stripRE:      /"|href="\.\.|\uFFFD/gi,
  basePath:     'http://www.chartlyrics.com',
  processBody:  PromiseConfig('cowboyArtist').processBody
});

PromiseConfig.promiseConfigs.azSong = PromiseConfig({
  handle:       "azSong",
  targetRE:     /br \/>[\s\S]+?</gi,
  stripRE:      /br \/>|<|\n|\uFFFD/gi,
  junkRE:       /educational purposes/i,
  processBody:  PromiseConfig('cowboySong').processBody
});

module.exports = PromiseConfig;
