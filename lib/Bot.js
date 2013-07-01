var Twit        = require('twit'),
    _           = require('lodash'),
    Word        = require('./Word.js'),
    utils       = require('./utils.js'),
    Promises    = require('./Promises.js'),
    when        = require('when'),
    cReplace    = utils.customReplace;

//Send in the bots
function Bot (botConfig, botStore) {
  if (!(this instanceof Bot)) {
    return new Bot(botConfig);
  }

  _.forOwn(botConfig, function(val, key) {
    this[key] = val;
  }, this);

  _.forOwn(botStore, function(val, key) {
    this[key] = val;
  }, this);

  this.T = new Twit(this.twitter);
  this.template = _.template(this.format);
  this.tweetQueue = this.tweetQueue || [];

  //Specialized setup by type (TODO: move to Child constructors?)
  if (this.type === 'lyrpictweet') {

    this.intervalId = setTimeout(this.makeLyrpicTweet, this.interval, this);

    //Special behavior for pulling from @lyricryptic content.
    if (this.lyricType === "lyricryptic") {
      this.lyricrypticPool = this.lyricrypticPool || [];
      this.populateLyricryptic(this);
      this.searchInterval = 60000*60*2;
      this.searchIntervalId = setTimeout(this.populateLyricryptic, this.searchInterval, this);
    }
  }

  else if (this.type === 'syllablecount') {
    this.queueMax = utils.setArgDefault(this.queueMax, 300);
    this.searchIntervalId = setTimeout(this.syllableFilter, this.searchInterval, this);
    this.intervalId = setTimeout(this.tweetFromQueue, this.interval, this, this.isRandom, this.isDestructive);
  }

  else if (this.type === 'tweetmash') {
    this.firstCriterion = this.firstCriterion || this.criteria[0];
    this.secondCriterion = this.secondCriterion || this.criteria[1];
    this.firsts = this.firsts || [];
    this.seconds = this.seconds || [];
    this.populateTweetMashSources(this); //Initial population of pools
    this.searchIntervalId = setTimeout(this.populateTweetMashSources, this.searchInterval, this);
    this.intervalId = setTimeout(this.composeTweetMash, this.interval, this);
  }

  else if (this.type === 'reminder') {
    this.tweetQueue = this.tweetQueue || this.tweetQueueFromArray(this.contentPool, this);
    this.intervalId = setTimeout(this.tweetFromQueue, this.interval, this, this.isRandom, this.isDestructive);
  }

  else if (this.type === 'youtube') {
    this.queueMax = utils.setArgDefault(this.queueMax, 500);
    this.inQueue = this.inQueue || {};
    this.searchIntervalId = setTimeout(this.youtubeFilter, this.searchInterval, this);
    this.intervalId = setTimeout(this.tweetFromQueue, this.interval, this, this.isRandom, this.isDestructive);
  }

  else if (this.type === 'snowclone') {
    for (var w in this.words) {
      this[w + 's'] = this[w + 's'] || {};
    }
    this.populateRandomWords(this); //Initial population of word pools.
    this.searchIntervalId = setTimeout(this.populateRandomWords, this.searchInterval, this);
    this.intervalId = setTimeout(this.makeSnowclone, this.interval, this);
  }

  else if (this.type === 'howilikeit') { //HACKY! Variation on snowclone
    for (var w in this.words) {
      this[w + 's'] = this[w + 's'] || {};
    }
    this.populateHowilikeit(this); //Initial population of word pools.
    this.searchIntervalId = setTimeout(this.makeHowilikeit, this.searchInterval, this);
    this.intervalId = setTimeout(this.tweetFromQueue, this.interval, this, false, true);
  }

  else if (this.type === 'latourandorder') { //HACKY! TODO: Abstract out
    this.firsts = this.firsts || [];
    this.seconds = this.seconds || [];
    this.populateLatourAndOrderSources(this); //Initial population of source pools
    this.searchIntervalId = setTimeout(this.populateLatourAndOrderSources, this.searchInterval, this);
    this.intervalId = setTimeout(this.composeTwoSources, this.interval, this.prioritySource, this.preSource, this);
  }

  Bot.bots[this.handle] = this;
}

Bot.prototype.tweetQueueFromArray = function(contentPool, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  contentPool = utils.setArgDefault(contentPool, bot.contentPool, Array);

  var tweetQueue = bot.tweetQueue || [],
      prefix = bot.prefix || '',
      suffix = bot.suffix || '';

  _.each(contentPool, function (t) {
    tweetQueue.push( {status: prefix + t + suffix});
  });

  return tweetQueue;
};

Bot.prototype.populateRandomWords = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);

  var wh,
      words = bot.words,
      api_key = bot.wordnik.api_key,
      reqParams;

  _.each(words, function(reqParams, wh) {
    when(Word.randomWords(reqParams, api_key))
    .then(function(list) {
      //console.log("Populating bot." + wh +"s with:",list);
      bot.moveWordsToPool(list, wh, bot)
    });
  });
  setTimeout(bot.populateRandomWords, bot.searchInterval, bot);
};

Bot.prototype.moveWordsToPool = function moveWordsToPool(list, wordhandle, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var pool = wordhandle + "s";

  _.each(list, function(word, ind, arr) {
    bot[pool][word] = word;
  });
};

//TODO: Change to a generalized template fulfillment function?
Bot.prototype.makeSnowclone = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var w,
      forTemplate = {},
      template = bot.template,
      words = bot.words,
      T = bot.T,
      wordPool, aWord,
      tweetContent = '';

  for (w in words) {
    wordPool = bot[w + 's'];
    aWord = utils.randomFromArray(_.toArray(wordPool));
    forTemplate[w] = aWord;
    delete wordPool[aWord];
  }

  tweetContent = template(forTemplate);
  utils.postTweet(T, tweetContent);
  return setTimeout(bot.makeSnowclone, bot.interval, bot);
};

Bot.prototype.populateHowilikeit = function(bot) {
  var wordnikKey = bot.wordnik.api_key,
      objects = bot.objects || {};

  Word.makeWordnik(wordnikKey);

  //Always try to have 5 objects with 3 or more good descriptors ready
  if (_.toArray(objects).length >= 5) {
    return;
  }

  when(Word.randomWords(bot.words.object))
  .then(
    function(rws) {
      _.each(rws, function (rw) {
        when(Word.descriptors(rw))
        .then(
          function(descs) {
            descs = _.without(descs, rw);
            if (descs.length >= 3) {
              objects[rw] = rw;
            }
          },
          function(e) {console.error("ERR",e);}
        )
      })
    },
    function(e) {console.error("ERR for",word + ":", e);}
  );
};

Bot.prototype.makeHowilikeit = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  bot.populateHowilikeit(bot); //Check if we need to refresh pool

  if (!bot.objects || _.isEmpty(bot.objects)) {return;} //None ready?

  var wordnikKey = bot.wordnik.api_key,
      objects = bot.objects,
      object = utils.randomFromArray(_.keys(objects)),
      template = bot.template,
      forTemplate = {"object": object},
      tweetQueue = bot.tweetQueue,
      tweetContent = '';

  when(Word(object).descriptors(),
    function(descs) {
      var useDescs = [].concat(descs).splice(_.random(descs.length - 3), 3);

      forTemplate.junc = utils.randomFromArray(bot.juncs);
      forTemplate.person = utils.randomFromArray(bot.persons);
      forTemplate.desc0 = useDescs[0];
      forTemplate.desc1 = useDescs[1];
      forTemplate.desc2 = useDescs[2];
      tweetContent = template(forTemplate);
      tweetQueue.push(tweetContent);
    }
  )
  .ensure(
    function() {delete objects[object];} //Remove from listing once used.
  );

  return setTimeout(bot.makeHowilikeit, bot.interval, bot);
};

Bot.prototype.getYoutubeURL = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var criteria = bot.criteria,
      youtubeURL = 'http://gdata.youtube.com/feeds/api/videos?q=' + criteria +
                   '&orderby=published&v=2&alt=json';

  return youtubeURL;
};

// Retrieve page somewhere 1-41 from Flickr photos with particular tags
// and CC or more liberal license, sorted by relevance:
// TODO: Abstract/generalize/default criteria with override object
Bot.prototype.getFlickrURL = function (bot, pageCount) {
  bot = utils.setArgDefault(bot, this, Bot);
  pageCount = utils.setArgDefault(pageCount, 41);

  var tags       =  bot.tags,
      flickr_key =  bot.flickr.flickr_key,
      randomPage =  Math.floor((Math.random() * pageCount) + 1),
      flickrURL  =  "http://api.flickr.com/services/rest/?method=flickr.photos.search&" +
                    "api_key=" + flickr_key + "&" +
                    "tags=" + tags + "&" +
                    "license=1%7C2%7C3%7C4%7C5%7C6%7C7%7C8&" +
                    "sort=relevance&" +
                    "safe_search=1&" +
                    "content_type=1&" +
                    "page=" + randomPage + "&" +
                    "format=json&" +
                    "nojsoncallback=1";

  return flickrURL;
};

//TODO: Abstract! Generalize! More versatile criteria!
Bot.prototype.youtubeFilter = function youtubeFilter (bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var youtubeURL = bot.getYoutubeURL(),
      youtubePromise = Promises.makeRequestPromise(youtubeURL);

  when(youtubePromise)
  .then(function(data) {
    var res = data.feed.entry,
        e, ee,
        entry,
        vidURL,
        tweetContent,
        queueMax = bot.queueMax,
        inQueue = bot.inQueue,
        tweetQueue = bot.tweetQueue;

    for (e = 0, ee = res.length; e < ee; e++) {
      entry = res[e];
      if (entry.title.$t.length < 117 && typeof inQueue[entry.id.$t] === 'undefined') {
        vidURL = entry.link[0].href.substr(0,entry.link[0].href.indexOf('&')); //trim off the &feature=youtube_gdata param
        tweetContent = entry.title.$t + ' ' + vidURL;
        tweetQueue.push(tweetContent);
        inQueue[entry.id.$t] = tweetContent;
      }
    }

    //TODO: Clear from inQueue{} -- can tweetQueue hold {status: , cacheId: } safely?
    //Keep our queue under a certain size, ditching oldest Tweets
    if (tweetQueue.length > queueMax) {
        tweetQueue = tweetQueue.slice(queueMax - 50);
    }
  });
  return setTimeout(bot.youtubeFilter, bot.searchInterval, bot);
};

Bot.prototype.populateLyricryptic = function populateLyricryptic(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return Promises.makeTwitterSearchPromise('from:lyricryptic',bot.T,'twitterTextOnly',bot.lyricrypticPool).then(function (lyricryptics) {
    _.each(lyricryptics, function(el, ind, arr) {
      bot.lyricrypticPool.push(el);
    });
    setTimeout(bot.populateLyricryptic, bot.searchInterval, bot);
  });
};

Bot.prototype.populateIMDBDescriptions = function populateIMDBDescriptions(showId, seasonCount, customReplace, targetPool, bot) {

  bot = utils.setArgDefault(bot, this, Bot);
  targetPool = utils.setArgDefault(targetPool, [], Array);

  var maxLength = 100;

  var targetUrl,
      n,
      allPromises = [];

  //CLEANUP: Could be prettier?
  for (n = 1; n <= seasonCount; n++) {
    targetUrl = "http://www.imdb.com/title/" + showId + "/episodes?season=" + n;
    allPromises[n - 1] = Promises.makeRequestPromise(targetUrl);
  }

  //CLEANUP: _.each(.each(.each)) seems ugly.
  when.all(allPromises)
  .then(function (seasons) {
    _.each(seasons, function (docBody, index) {
      var descBoxes;
      descBoxes = docBody.match(/itemprop="description"[\s\S]+?<\/div>/ig);
      _.each(descBoxes, function (el, i) {
        var splitEl;

        el = utils.customReplace(el.replace(/^.+?>|<.+?>/gi,""), customReplace[0], customReplace[1], customReplace[2]).trim();
        splitEl = utils.keepSplit(el, /([\.\?\!]+)/g);

        _.each(splitEl, function (split, index) {
          split = split.trim();
          if (/\w/.test(split) && split.length <= maxLength && !_.contains(targetPool,split)) {
            targetPool.push(split);
          }
        });
      });
    });
  });

  return targetPool;
};

//TODO: Expand to arbitrary criteria count?
//TODO: Support multiple 'pivot' values? (see @LatourSwag)
//TODO? Allow custom validation values (like excluding "RT"s & c.)
Bot.prototype.tweetMashFilter = function tweetMashFilter(tweetTexts, targetPool, bot) {
  var since_id = targetPool.since_id || 0;
  bot = utils.setArgDefault(bot, this, Bot);
  targetPool = targetPool || [];
  var passedFilter =  _.filter(tweetTexts, function (text) {
                        return (text.indexOf(bot.pivot) !== -1 && text.indexOf('RT') !== 0 && text.indexOf(bot.pivot) > 20);
                      });
  targetPool = targetPool.concat(passedFilter);
  targetPool.since_id = since_id;
  return targetPool;
};

//!!NOT USED!!
/*
Bot.prototype.tweetMashAltFilter = function tweetMashAltFilter(tweetTexts, targetPool, bot) {
  //This is the alternate filter which LatourSwag used for the @LatourBot tweets:
  var since_id = targetPool.since_id || 0,
      passedAltFilter = _(tweetTexts).filter( function (text) {
  if (text.indexOf(bot.pivot) !== -1) { // || text.indexOf(', ') !== -1) {
      if ((text.indexOf(bot.pivot) < 90 && text.indexOf(bot.pivot) > 30)) { // || (text.indexOf(', ') < 90 && text.indexOf(', ') > 30)) {
        targetPool.push(text);
      }
    }
    else if (text.length < 50) {
      targetPool.shorts = (targetPool.shorts || []).concat(bot.pivot + text.toLowerCase());
    }
  });

  targetPool.shorts = targetPool.shorts.concat(passedAltFilter);
  targetPool.since_id = since_id;

  return targetPool;

};
*/
Bot.prototype.tweetMashLengthFilter = function tweetMashLengthFilter(tweetTexts, targetPool, maxLength, bot) {
  maxLength = utils.setArgDefault(maxLength, 69);
  var since_id = targetPool.since_id || 0,
      passedFilter = _.filter(tweetTexts, function (text) {
        return (text.length <= maxLength);
      });

  targetPool = targetPool.concat(passedFilter);
  targetPool.since_id = since_id;

  return targetPool;
};

//Based on Darius K's @LatourSwag bot source
//TODO: Expand to support arbitrary number of sources/criteria?
//TODO: Abstract (this & populateLatourAndOrder... could share function)
Bot.prototype.populateTweetMashSources = function populateTweetMashSources(bot) {
  bot = utils.setArgDefault(bot, this, Bot);

  Promises.makeTwitterSearchPromise(bot.criteria[0], bot.T, "twitterTextOnly", bot.firsts).then(function (tweetTexts) {
    bot.firsts = bot.tweetMashFilter(tweetTexts, bot.firsts, bot);
  });
  Promises.makeTwitterSearchPromise(bot.criteria[1], bot.T, "twitterTextOnly", bot.seconds).then(function (tweetTexts) {
    bot.seconds = bot.tweetMashFilter(tweetTexts, bot.seconds, bot);
  });

  return setTimeout(bot.populateTweetMashSources, bot.searchInterval, bot);
};

//HACKY! Should be abstracted out.
Bot.prototype.populateLatourAndOrderSources = function populateLatourAndOrderSources(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  if (_.isEmpty(bot.firsts)) {
    //TODO: Pass object containing multiple showId/SeasonCounts for processing?
    var replaceParams = [/((?:\w\.){2,}|Sgt\.|Det\.|Sen\.|Ph\.(?:D\.?)?|Dr\.|st\.|E\. coli)/ig, /\./g, ""];
    bot.populateIMDBDescriptions("tt0098844", 20, replaceParams, bot.firsts);
    //bot.populateIMDBDescriptions("tt0203259", 14, replaceParams, bot.firsts); //SVU
    bot.populateIMDBDescriptions("tt0275140", 10, replaceParams, bot.firsts);
  }
  when(Promises.makeTwitterSearchPromise("from:LatourBot", bot.T, "twitterTextOnly", bot.seconds))
  .then(
    function (tweetTexts) {
      bot.seconds = bot.tweetMashLengthFilter(tweetTexts, bot.seconds, 60, bot);
      bot.seconds = _.unique(bot.seconds);
    },
    function(e) {console.error("ERR:",e);}
  );
  setTimeout(bot.populateLatourAndOrderSources, bot.searchInterval, bot);
};

Bot.prototype.composeTwoSources = function composeTwoSources(prioritySource, preSource, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  prioritySource = prioritySource || 0;
  preSource = preSource || 0;
  var T = bot.T,
      primaries, primary,
      others, viableOthers, other,
      tweetContent;

  if (prioritySource === 1) {
    primaries = bot.seconds;
    others = bot.firsts;
  }
  else {
    primaries = bot.firsts;
    others = bot.seconds;
  }

  primary = utils.randomFromArray(primaries, false, null, false);

  viableOthers = _.filter(others, function (text) {
    return (text.length + primary.length < 140);
  });

  //Or take any one if none are short enough #yolo
  if (_.isEmpty(viableOthers)) {
    viableOthers = others;
  }

  other = utils.randomFromArray(viableOthers, false, null, false);

  if (preSource === -1) { //random order
    preSource = _.random(0,1);
  }

  if (preSource === 0) { //primary source as 'pre'
    tweetContent = bot.template({"pre": primary, "post": other});
  }
  else if (preSource === 1) { //primary source as 'post'
    tweetContent = bot.template({"pre": other, "post": primary});
  }

  tweetContent = _.unescape(tweetContent);
  if (tweetContent.length > 140) {
    tweetContent = tweetContent.substr(0, 139) + '…';
  }

  utils.postTweet(T, tweetContent);
  return setTimeout(bot.composeTwoSources, bot.interval, bot.prioritySource, bot.preSource, bot);
};

//TODO: Support multiple 'pivot' values
//TODO: Support "shorts" from a source (no pivot.)
//TODO: Use "primaries"/"others" (ala composeTwoSources() function.)
Bot.prototype.composeTweetMash = function composeTweetMash (bot) {
  bot = utils.setArgDefault(bot, this, Bot);

  var T = bot.T,
      pivot = bot.pivot,
      firsts = bot.firsts,
      seconds = bot.seconds,
      first,
      second,
      //shortSeconds = bot.seconds.shorts,
      //allSeconds = seconds.concat(shortSeconds),
      pre = bot.pre,
      post = bot.post,
      tweetContent,
      secondfirst = Math.random() < 0.5 ? false : true;

  first = utils.randomFromArray(firsts, false, null, true);  //firsts[Math.floor(Math.random() * firsts.length)];
  // console.log("of", firsts.length, "firsts, selected:", first);
  second = utils.randomFromArray(seconds, false, null, true); //seconds[Math.floor(Math.random() * seconds.length)];
  // console.log("of", seconds.length, "seconds, selected:", second);

  if (secondfirst) {
    pre = second.substr(0, second.indexOf(pivot));
    post = first.substr(first.indexOf(pivot) + pivot.length, 140);
  }
  else {
    pre = first.substr(0, first.indexOf(pivot));
    post = second.substr(second.indexOf(pivot) + pivot.length, 140);
  }

  tweetContent = bot.template({"pre": pre, "pivot": pivot, "post": post});
  // strip out URLs and usernames
  tweetContent = tweetContent.replace(/(https?:\/\/[^\s]+)/g, '');
  tweetContent = tweetContent.replace(/\s?@[a-zA-Z0-9_]+(\s?)/g, '$1');
  // decode any escaped characters so that '&lt;' will show as '<', etc
  tweetContent = _.unescape(tweetContent);
  // truncate to 140 chars so twitter doesn't reject it (most tweets are < 140 but some aren't)
  if (tweetContent.length > 140) {
    tweetContent = tweetContent.substr(0, 139) + '…';
  }
  //console.log(tweetContent);
  //console.log(tweetContent.length);

  //return it!
  //return tweetContent;

  //Add it to our TweetQueue
  //bot.tweetQueue.push(tweetContent);

  // tweet it!
  utils.postTweet(T, tweetContent);
  return setTimeout(bot.composeTweetMash, bot.interval, bot);
};

//Search 100 recent tweets for those with certain number of syllables
//TODO: Abstract out search criteria for more versatility
//TODO: use utils.twitterSearch
//TODO: multiple targets (e.g. haiku)
Bot.prototype.syllableFilter = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);

  var T = bot.T,
      tweetQueue = bot.tweetQueue,
      queueMax = bot.queueMax,
      prefix = bot.prefix || '',
      suffix = bot.suffix || '',
      targetSyllables = bot.targetSyllables,
      searchParams  = {
        "q": 'lang:en',
        "result-type": 'recent',
        "count": 100,
      };

  T.get('search/tweets', searchParams, function(err, reply) {
    if (err) {console.log(err);}

    var s, ss,
        t,
        text,
        sepCount,
        sCount,
        tArr,
        w, ww,
        word,
        tweetContent = '',
        wordSep       = /^\w|[^\w']+(?!\W*$)/g,
        stripEntities = /^RT |[@#].+?[\S]+?\s|[@#][^@#]+$|http:\/\/[\S]+|[,\|\\\/\-\.]+|[:;]\-?[dxpc3be]|[o\^x]_+?[o\^x]/gi; //remove RT prefix, mentions, hashtags, common emoticons

    if (!reply) {return setTimeout(bot.syllableFilter, bot.searchInterval, bot);}

    for (s = 0, ss = reply.statuses.length; s < ss; s++) {
      t = reply.statuses[s];
      text = t.text.replace(stripEntities, '').trim();
      sepCount = (text.match(wordSep) || []).length;

      //Quick filter for tweets with more words than we want syllables, or too long to tweet.
      if ( (text.length + prefix.length + suffix.length) <= 140 && sepCount > 0 && sepCount <= targetSyllables) {
        tArr = text.replace('-',' ').split(' ');

        for (w = 0, ww= tArr.length, sCount = 0; w < ww; w++) {
          word = tArr[w].replace(/^\W+|\W+$/g,'').trim();
          if (word !== '') {
            sCount += (new Word(word).countSyllables() || 1000); //intentionally overrun syllable target if no pronunciation found
            if (word === 'our' || word === 'hour') {sCount -= 1;} //adjust down syllable count where we disagree with CMUDict
            if (sCount > targetSyllables) {
              break;
            }
          }
        }

        if (sCount === targetSyllables) {
          tweetContent = _.unescape(prefix + text + suffix);
          tweetQueue.push({status: tweetContent, in_reply_to_status_id: t.id});
        }
      }
    }

    //Keep our queue under a certain size, ditching oldest Tweets
    if (tweetQueue.length > queueMax) {
        tweetQueue = tweetQueue.slice(queueMax - 50);
    }

    //Set next iteration
    setTimeout(bot.syllableFilter, bot.searchInterval, bot);
  });
};

//Send Tweet from Bot's prepared array
Bot.prototype.tweetFromQueue = function(bot, isRandom, isDestructive) {
  bot = utils.setArgDefault(bot, this, Bot);

  var T = bot.T,
      tweetQueue = bot.tweetQueue,
      cursor = tweetQueue.cursor = tweetQueue.cursor || 0,
      queuedTweet;

  if (isRandom) {
    queuedTweet = utils.randomFromArray(bot.tweetQueue, false, null, bot.isDestructive);
  }
  else {
    queuedTweet = tweetQueue[cursor];
    if (isDestructive) {
      tweetQueue.shift();
    }
    else {
      (cursor + 1 >= tweetQueue.length) ? tweetQueue.cursor = 0 : tweetQueue.cursor += 1;
    }
  }

  if (queuedTweet !== null && typeof queuedTweet !== 'undefined') {
    utils.postTweet(T, queuedTweet);
  }

  return setTimeout(bot.tweetFromQueue, bot.interval, bot, bot.isRandom, bot.isDestructive);
};

//TODO: Clean these up with when().reduce/...?
Bot.prototype.ohhlaRandomTop30Lyric = function ohhlaRandomTop30Lyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return Promises.makeRandomOhhlaSongPromise(null, bot).then(function(songURL) {
            return Promises.makeOhhlaLyricsPromise(songURL, bot).then(function (fullLyric) {
                return utils.randomFromArray(Word.findRhymes(fullLyric));
              });
          });
};

Bot.prototype.ohhlaRandomFaveLyric = function ohhlaRandomFaveLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  Promises.makeRandomFavoriteOhhlaPromise(bot).then(function (artistPage) {
            return Promises.makeRandomOhhlaSongPromise(artistPage, bot).then(function (songURL) {
              return Promises.makeOhhlaLyricPromise(songURL, bot).then(function (fullLyric) {
                return utils.randomFromArray(Word.findRhymes(fullLyric));
              });
            });
          });
};

Bot.prototype.cowboyRandomLyric = function cowboyRandomLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  Promises.makeRandomCowboyArtistPromise(bot).then(function (artistURL) {
            return Promises.makeRandomCowboySongPromise(artistURL, bot).then(function (songURL) {
              return Promises.makeCowboyLyricPromise(songURL, bot).then(function (fullLyric) {
                return utils.randomFromArray(Word.findRhymes(fullLyric));
              });
            });
          });
};

Bot.prototype.azRandomLyric = function azRandomLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  Promises.makeRandomAzArtistPromise(bot).then(function (artistURL) {
            return Promises.makeRandomAzSongPromise(artistURL, bot).then(function (songURL) {
              return Promises.makeAzLyricPromise(songURL, bot).then(function (fullLyric) {
                return utils.randomFromArray(Word.findRhymes(fullLyric));
              });
            });
          });
};

Bot.prototype.flickrRandomPhotoURL = function flickrRandomPhotoURL(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return Promises.makeFlickrPromise(bot.getFlickrURL(bot), bot).then(function(flickrResponse) {
    var randomPhotoIndex = Math.floor(Math.random() * 100), // * flickrResponse.photos.photo.length instead? In case fewer than 100?
        randomPhoto = flickrResponse.photos.photo[randomPhotoIndex],
        picURL = 'http://flickr.com/' + randomPhoto.owner + '/' + randomPhoto.id + '/';         //compose (non-pretty) URL to Flickr image
    return picURL;
  });
};

//Main function for bots of type 'lyrpictweet'
Bot.prototype.makeLyrpicTweet = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);

  var T = bot.T,
      tweetContent = '',
      lyricPromise,
      flickrPromise = bot.flickrRandomPhotoURL(bot);

      if (bot.lyricType === 'rap') {
        lyricPromise  = bot.ohhlaRandomFaveLyric(bot);
      }
      else if (bot.lyricType === 'country') {
        lyricPromise = bot.cowboyRandomLyric(bot);
      }
      else if (bot.lyricType === 'lyricryptic') {
        //get random @lyricryptic tweet from bot's pool with length < 117 #thankUbasedBrendan
        lyricPromise = utils.randomFromArray(bot.lyricrypticPool, false, function(text) {return (text.length <= 117);});
      }
      else {
        lyricPromise = bot.azRandomLyric(bot);
      }

  when.all([lyricPromise, flickrPromise])
  .then(function(results) {
    var lyricSegment  = results[0],
        photoURL      = results[1];

    if (lyricSegment && photoURL) {
      tweetContent = bot.template({"lyricSegment": lyricSegment, "photoURL": photoURL});
      utils.postTweet(T, tweetContent);
    }

    return setTimeout(bot.makeLyrpicTweet, bot.interval, bot);
  },
  function(err) {
    //if at first you don't succeed...
    bot.makeLyrpicTweet(bot);
  });
};

Bot.bots = {};    //Holder for Bot objects

Bot.storeBots = function storeBots() {
  var dontPersist = ["twitter", "T", "wordnik", "flickr", "intervalId",
                     "searchIntervalId", "template", "hideDash"];
  botStore = _(Bot.bots).each().cloneDeep();
  _.each(botStore, function (bot, handle, bots) {
    _.each(dontPersist, function(key) {
      delete bot[key];
    });
  });
  //return JSON.stringify(botStore,null,"  ");
  return botStore;
}

module.exports = Bot;
