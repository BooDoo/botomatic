var Twit        = require('twit'),
    _           = require('lodash'),
    Word        = require('./Word.js'),
    utils       = require('./utils.js'),
    Promises    = require('./Promises.js'),
    querystring = require('querystring'),
    request     = require('request'),
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

  //Specialized setup by type (TODO: move to Child constructors)
  if (this.type === 'lyrpictweet') {

    this.intervalId = setInterval(this.makeLyrpicTweet, this.interval, this);

    //Special behavior for pulling from @lyricryptic content.
    if (this.lyrictype === "lyricryptic") {
      this.lyricrypticPool = this.lyricrypticPool || [];
      this.populateLyricryptic(this);
      this.searchIntervalId = setInterval(this.populateLyricryptic, 60000*60*2, this);
    }
  }

  else if (this.type === 'syllablecount') {
    this.queueMax = utils.setArgDefault(this.queueMax, 300);
    this.searchIntervalId = setInterval(this.syllableFilter, this.searchInterval, this);
    this.intervalId = setInterval(this.tweetFromQueue, this.interval, this);
  }

  else if (this.type === 'tweetmash') {
    this.firstCriterion = this.firstCriterion || this.criteria[0];
    this.secondCriterion = this.secondCriterion || this.criteria[1];
    this.firsts = this.firsts || [];
    this.seconds = this.seconds || [];
    this.populateTweetMashSources(this); //Initial population of source pools
    this.searchIntervalId = setInterval(this.populateTweetMashSources, this.searchInterval, this);
    this.intervalId = setInterval(this.composeTweetMash, this.interval, this);
  }

  else if (this.type === 'reminder') {
    this.tweetQueue = this.tweetQueue || this.tweetQueueFromArray(this.contentPool, this);
    this.intervalId = setInterval(this.tweetFromQueue, this.interval, this, this.isRandom);
  }

  else if (this.type === 'youtube') {
    this.queueMax = utils.setArgDefault(this.queueMax, 500);
    this.inQueue = this.inQueue || {};
    this.searchIntervalId = setInterval(this.youtubeFilter, this.searchInterval, this);
    this.intervalId = setInterval(this.tweetFromQueue, this.interval, this, this.isRandom);
  }

  else if (this.type === 'snowclone') {
    for (var w in this.words) {
      this[w + 's'] = this[w + 's'] || {};
    }
    this.populateRandomWords(this); //Initial population of the random word pools.
    this.searchIntervalId = setInterval(this.populateRandomWords, this.searchInterval, this);
    this.intervalId = setInterval(this.makeSnowclone, this.interval, this);
  }

  else if (this.type === 'howilikeit') { //HACKY! Variation on snowclone
    for (var w in this.words) {
      this[w + 's'] = this[w + 's'] || {};
    }
    this.populateRandomWords(this); //Initial population of the random word pools.
    this.searchIntervalId = setInterval(this.makeHowilikeit, this.searchInterval, this);
    this.intervalId = setInterval(this.tweetFromQueue, this.interval, this, false, true);
  }

  else if (this.type === 'latourandorder') { //HACKY! Should be abstracted out; similar to tweetmash
    this.firstCriterion = this.criteria[0];
    this.secondCriterion = this.criteria[1];
    this.firsts = this.firsts || [];
    this.seconds = this.seconds || [];
    this.populateLatourAndOrderSources(this); //Initial population of source pools
    this.searchIntervalId = setInterval(this.populateLatourAndOrderSources, this.searchInterval, this);
    //this.intervalId = setInterval(this.composeLatourAndOrder, this.interval, this);
    this.intervalId = setInterval(this.composeTwoSources, this.interval, this.prioritySource, this.preSource, this);
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

  for (wh in words) {
    reqParams = bot.words[wh];

    when(Word.randomWords(reqParams, api_key))
    .then(function(list) {bot.moveWordsToPool(list, wh, bot)});
  }
};

Bot.prototype.moveWordsToPool = function moveWordsToPool(list, wordhandle, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var pool = wordhandle + "s";

  _.each(list, function(word, ind, arr) {
    bot[pool][word] = word;
  });
};

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
};

Bot.prototype.makeHowilikeit = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var wordnikKey = bot.wordnik.api_key,
      objects = bot.objects,
      object = utils.randomFromArray(_.toArray(objects),false, function(word) {if (Word(word).descriptors === null) {Word.descriptiveWords(word, wordnikKey); return true;} if (Word(word).descriptors.length >= 4) {return true;} else {delete objects[word]; return false;}}),
      descs = Word(object).descriptors,
      descPromises = [],
      template = bot.template,
      forTemplate = {"object": object},
      tweetQueue = bot.tweetQueue,
      tweetContent = '';
  if (descs === null) {console.log("No",object,"descriptors at this time!"); return false;}

  console.log("TRYING TO MAKE TWEET USING:",object);
  if (_.toArray(objects).length < 10) {
    Word.randomWords(wordnikKey, bot.words.object)
        .pipe(function(words) {
          bot.moveWordsToPool(words, "object", bot);
        });
  }

  var makeDescPromise = function makeDescPromise() {
    console.log("Entering makeDescPromise()...");
    var desc = utils.randomFromArray(descs,false, function(word) {return word !== object && !_.contains(descPromises, word)}),
        descDeferred = _.Deferred(),
        descPromise = descDeferred.promise();

    console.log("TESTING POS FOR:",desc);
        Word.partOfSpeech(desc, wordnikKey, "adjective,adverb").fail(function() {descs = _.without(descs, desc); makeDescPromise();})
        .done(function() {console.log("Resolving with",desc,"as a desc"); descDeferred.resolve(desc);})
        .fail(function() {console.log(desc,"is not an adjective or adverb");});

    if (descs.length < 4) {console.log("Bailing on descPromise; not enough descs"); descDeferred.reject()};

    return descPromise
  };

  descPromises = [makeDescPromise(), makeDescPromise(), makeDescPromise()];
  _.when.apply(this, descPromises).done(function (desc0, desc1, desc2) {
    console.log("GOT THREE DESCS FULFILLED! for",object);
    console.log("They are:",desc0,desc1,desc2);

    forTemplate.junc = utils.randomFromArray(bot.juncs);
    forTemplate.person = utils.randomFromArray(bot.persons);
    forTemplate.desc0 = desc0;
    forTemplate.desc1 = desc1;
    forTemplate.desc2 = desc2;
    tweetContent = template(forTemplate);
    console.log("MADE A TWEET:",tweetContent);
    //utils.postTweet(T, tweetContent);
    tweetQueue.push(tweetContent);
  }).fail(function() {
    console.log("Not enough valid descriptors for",object);
  }).always(function() {
    delete objects[object]; //Remove from listing once tried/used.
  });
}

Bot.prototype.getYoutubeURL = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var criteria = bot.criteria,
      youtubeURL = 'http://gdata.youtube.com/feeds/api/videos?q=' + criteria +
                   '&orderby=published&v=2&alt=json';

  return youtubeURL;
};

// Retrieve page somewhere 1-41 from Flickr photos with particular tags and
// CC or more liberal license, sorted by relevance:
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
        //console.log('Gonna push: ', tweetContent);
        tweetQueue.push(tweetContent);
        inQueue[entry.id.$t] = tweetContent;
      }
    }

    //console.log('tweetQueue length: ', bot.tweetQueue.length);

    //Keep our queue under a certain size, ditching oldest Tweets
    //TODO: Clear from inQueue{} -- can tweetQueue hold {status: , cacheId: } safely?
    if (tweetQueue.length > queueMax) {
        tweetQueue = tweetQueue.slice(queueMax - 50);
    }
  });
};

Bot.prototype.populateLyricryptic = function populateLyricryptic(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return Promises.makeTwitterSearchPromise('from:lyricryptic',bot.T,'twitterTextOnly',bot.lyricrypticPool).pipe(function (lyricryptics) {
    _.each(lyricryptics, function(el, ind, arr) {
      bot.lyricrypticPool.push(el);
    });
  });
};

Bot.prototype.populateIMDBDescriptions = function populateIMDBDescriptions(showId, seasonCount, customReplace, targetPool, bot) {

  bot = utils.setArgDefault(bot, this, Bot);
  targetPool = utils.setArgDefault(targetPool, [], Array);

  var maxLength = 100;

  var targetUrl,
      descBoxes,
      n,
      allPromises = [];
      //over = 0, under = 0,

  for (n = 1; n <= seasonCount; n++) {
    targetUrl = "http://www.imdb.com/title/" + showId + "/episodes?season=" + n;
    allPromises[n - 1] = Promises.makeRequestPromise(targetUrl);
  }

  //console.log("We have", allPromises.length, "promises.");
  //TODO: Clean this up! _.each(...f(){_.each()}) seems ugly.
  when(allPromises)
  .then(function () {
    //console.log("Running .when() with", arguments.length, "arguments.");
    _.each(arguments, function (docBody, index) {
      //console.log("Working with allPromises[", index, "]");
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

//TODO: Align with arbitrary criteria count (pool associated w/ each item in bot.criteria)
//TODO: Support multiple 'pivot' values? (see: LatourSwag also accepting "," as a pivot)
//TODO? Allow custom validation values (like excluding "RT"s below)
Bot.prototype.tweetMashFilter = function tweetMashFilter(tweetTexts, targetPool, bot) {
  //console.log("tweetMashFilter IS actualy running!");
  var since_id = targetPool.since_id || 0;
  bot = utils.setArgDefault(bot, this, Bot);
//  console.log("targetPool.since_id before assignment:", targetPool.since_id);
  targetPool = targetPool || [];
//  console.log("targetPool.since_id after assignment:", targetPool.since_id);
  var passedFilter =  _.filter(tweetTexts, function (text) {
                        return (text.indexOf(bot.pivot) !== -1 && text.indexOf('RT') !== 0 && text.indexOf(bot.pivot) > 20);
                      });
  // console.log("passedFilter:", passedFilter);
  targetPool = targetPool.concat(passedFilter);
  targetPool.since_id = since_id;
  return targetPool;
};

//!!NOT USED!!
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
      //console.log(text);
      targetPool.shorts = (targetPool.shorts || []).concat(bot.pivot + text.toLowerCase());
    }
  });

  targetPool.shorts = targetPool.shorts.concat(passedAltFilter);
  targetPool.since_id = since_id;

  return targetPool;

};

Bot.prototype.tweetMashLengthFilter = function tweetMashLengthFilter(tweetTexts, targetPool, maxLength, bot) {
  maxLength = utils.setArgDefault(maxLength, 69);
  var since_id = targetPool.since_id || 0,
      passedFilter = _.filter(tweetTexts, function (text) {
        //console.log("text.length", text.length);
        return (text.length <= maxLength);
      });

  console.log("LatourBot passedFilter.length:", passedFilter.length,"\n",passedFilter);
  targetPool = targetPool.concat(passedFilter);
  targetPool.since_id = since_id;

  return targetPool;
};

//Based on Darius K's @LatourSwag bot source
//TODO: Expand out to support arbitrary number of sources/criteria, instead of 2?
Bot.prototype.populateTweetMashSources = function populateTweetMashSources(bot) {
  bot = utils.setArgDefault(bot, this, Bot);

  Promises.makeTwitterSearchPromise(bot.criteria[0], bot.T, "twitterTextOnly", bot.firsts).pipe(function (tweetTexts) {
    // console.log("Running filter with", tweetTexts.length, "potential tweets...");
    bot.firsts = bot.tweetMashFilter(tweetTexts, bot.firsts, bot);
  });
  Promises.makeTwitterSearchPromise(bot.criteria[1], bot.T, "twitterTextOnly", bot.seconds).pipe(function (tweetTexts) {
    // console.log("Running filter with", tweetTexts.length, "potential tweets...");
    bot.seconds = bot.tweetMashFilter(tweetTexts, bot.seconds, bot);
  });
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
  Promises.makeTwitterSearchPromise("from:LatourBot", bot.T, "twitterTextOnly", bot.seconds).pipe(function (tweetTexts) {
    // console.log("Running filter with", tweetTexts.length, "potential tweets...");
    bot.seconds = bot.tweetMashLengthFilter(tweetTexts, bot.seconds, 60, bot);
    bot.seconds = _.unique(bot.seconds);
  });
};

Bot.prototype.composeTwoSources = function composeTwoSources(prioritySource, preSource, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  prioritySource = prioritySource || 0;
  preSource = preSource || 0;
  var T = bot.T,
      //firsts = bot.firsts,  //Should we even use firsts/seconds names locally?
      //seconds = bot.seconds,//Or just assign primaries/others straight off?
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

};

//TODO: Support multiple 'pivot' values; support "shorts" from a source that lack pivot.
//TODO: Grab and sort into "firsts" and "seconds" to align with composeTwoSources() generalized function.
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
};

//Search 100 recent tweets for those with certain number of syllables
//TODO: Abstract out search criteria for more versatility; use utils.twitterSearch; multiple targets (e.g. haiku)
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

    for (s = 0, ss = reply.statuses.length; s < ss; s++) {
      t = reply.statuses[s];
      text = t.text.replace(stripEntities, '').trim();
      sepCount = (text.match(wordSep) || []).length;

      //Quick filter for tweets with more words than we want syllables, or too long to tweet.
      if ( (text.length + prefix.length + suffix.length) <= 140 && sepCount > 0 && sepCount <= targetSyllables) {
        //console.log(('SEEMS LEGIT: ').green)
        //console.log((text).grey)
        tArr = text.replace('-',' ').split(' ');

        for (w = 0, ww= tArr.length, sCount = 0; w < ww; w++) {
          word = tArr[w].replace(/^\W+|\W+$/g,'').trim();
          if (word !== '') {
            sCount += (new Word(word).countSyllables() || 1000); //intentionally overrun syllable target if no pronunciation found
            if (word === 'our' || word === 'hour') {sCount -= 1;} //adjust down syllable count where we disagree with CMUDict
            //console.log('+ ' + word + '= ' + sCount);
            if (sCount > targetSyllables) {
              break;
            }
          }
        }

        if (sCount === targetSyllables) {
          //console.log('We got one! : ', text);
          tweetContent = _.unescape(prefix + text + suffix);
          tweetQueue.push({status: tweetContent, in_reply_to_status_id: t.id});
        }
      }
    }

    //Keep our queue under a certain size, ditching oldest Tweets
    if (tweetQueue.length > queueMax) {
        tweetQueue = tweetQueue.slice(queueMax - 50);
    }
  });
};

//Send Tweet from Bot's prepared array
Bot.prototype.tweetFromQueue = function(bot, isRandom, isDestructive) {
  bot = utils.setArgDefault(bot, this, Bot);

  var T = bot.T,
      fromQueue = {"element": null, "index": null, "array": null},
      tweetQueue = bot.tweetQueue,
      cursor = tweetQueue.cursor || 0,
      queuedTweet;


  if (isRandom) {
    fromQueue = utils.randomFromArray(bot.tweetQueue);// , true);
    queuedTweet = fromQueue;
    if (isDestructive) {
      tweetQueue = _.without(tweetQueue, queuedTweet);
    }
  }
  else {
    //console.log("Tweeting item",cursor,"from tweetQueue of",tweetQueue.length,"items.");
    queuedTweet = tweetQueue[cursor];
    if (isDestructive) {
      tweetQueue.shift();
    }
    else {
      (cursor + 1 >= tweetQueue.length) ? tweetQueue.cursor = 0 : tweetQueue.cursor = cursor+1;
      //console.log("Incremented cursor to", tweetQueue.cursor);
    }
  }

  if (queuedTweet === null || typeof queuedTweet === 'undefined') {
    return;
  }
  else {
    utils.postTweet(T, queuedTweet);
  }
};

Bot.prototype.ohhlaRandomTop30Lyric = function ohhlaRandomTop30Lyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  Promises.makeRandomOhhlaSongPromise(null, bot).pipe(function(songURL) {
            return Promises.makeOhhlaLyricsPromise(songURL, bot).pipe(function (fullLyric) {
                return utils.randomFromArray(Word.findRhymes(fullLyric));
              });
          });
};

Bot.prototype.ohhlaRandomFaveLyric = function ohhlaRandomFaveLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  Promises.makeRandomFavoriteOhhlaPromise(bot).pipe(function (artistPage) {
            return Promises.makeRandomOhhlaSongPromise(artistPage, bot).pipe(function (songURL) {
              return Promises.makeOhhlaLyricPromise(songURL, bot).pipe(function (fullLyric) {
                return utils.randomFromArray(Word.findRhymes(fullLyric));
              });
            });
          });
};

Bot.prototype.cowboyRandomLyric = function cowboyRandomLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  Promises.makeRandomCowboyArtistPromise(bot).pipe(function (artistURL) {
            return Promises.makeRandomCowboySongPromise(artistURL, bot).pipe(function (songURL) {
              return Promises.makeCowboyLyricPromise(songURL, bot).pipe(function (fullLyric) {
                return utils.randomFromArray(Word.findRhymes(fullLyric));
              });
            });
          });
};

Bot.prototype.azRandomLyric = function azRandomLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  Promises.makeRandomAzArtistPromise(bot).pipe(function (artistURL) {
            return Promises.makeRandomAzSongPromise(artistURL, bot).pipe(function (songURL) {
              return Promises.makeAzLyricPromise(songURL, bot).pipe(function (fullLyric) {
                return utils.randomFromArray(Word.findRhymes(fullLyric));
              });
            });
          });
};

Bot.prototype.lyricrypticRandomLyric = function lyricrypticRandomLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  utils.randomFromArray(bot.lyricrypticPool, true, true);
};

Bot.prototype.flickrRandomPhotoURL = function flickrRandomPhotoURL(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return Promises.makeFlickrPromise(bot.getFlickrURL(bot), bot).pipe(function(flickrResponse) {
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
        //TODO: Build in some error catching (404, no links to songs on artist page...)
        lyricPromise = bot.cowboyRandomLyric(bot);
      }
      else if (bot.LyricType === 'lyricryptic') {
        //get random @lyricryptic tweet from bot's pool with length < 117 #thankUbasedBrendan
        lyricPromise = utils.randomFromArray(bot.lyricrypticPool, false, function(text) {return (text.length <= 117);});
      }
      else {
        lyricPromise = bot.azRandomLyric(bot);
      }

  when([lyricPromise, flickrPromise])
  .then(function(lyricSegment, photoURL) {
    //console.log('Got both promises fulfilled for', bot.handle);
    if (lyricSegment && photoURL) {
      tweetContent = bot.template({"lyricSegment": lyricSegment, "photoURL": photoURL});
      utils.postTweet(T, tweetContent);
    } else {
      //console.log('lyricSegment or photoURL missing! RETURNING 0');
      //retry from the top?
      return 0;
    }
  },
  function(err) {
    //if at first you don't succeed...
    //console.log('Some promise failed for ', bot.handle, '\t\t', err);
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
