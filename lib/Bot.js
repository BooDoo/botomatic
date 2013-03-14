var Twit        = require('twit'),
    _           = require('lodash'),
    Word        = require('./Word.js').Word,
    utils       = require('./utils.js'),
    PromiseConfig=require('./PromiseConfig.js').PromiseConfig,
    querystring = require('querystring'),
    restclient  = require('node-restclient'),
    request     = require('request'),
    ent         = require('ent');
    

    _.mixin(require('underscore.deferred'));

//Send in the bots
function Bot (botConfig) {
  if (!(this instanceof Bot)) {
    return new Bot(botConfig);
  }

  var p;

  for (p in botConfig) {
    this[p] = botConfig[p];
  }

  this.T = new Twit(this.twitter);
  
  //Specialized setup by type (TODO: move to Child constructors)
  if (this.type === 'lyrpictweet') {
      
    this.intervalId = setInterval(this.makeLyrpicTweet, this.interval, this);
    //TODO: Abstract lyricPromise (rap/country variants) to own promise-returning function
    //this.lyricPromise = ;
    
  }
  else if (this.type === 'syllablecount') {    
    this.queueMax = utils.setArgDefault(this.queueMax, 300);
    this.tweetQueue = [];
    this.searchIntervalId = setInterval(this.syllableFilter, this.searchInterval, this);
    this.intervalId = setInterval(this.tweetFromQueue, this.interval, this);
  }
  else if (this.type === 'tweetmash') {
      this.firstCriterion = "http://search.twitter.com/search.json?callback=?&rpp=100&q='" + encodeURIComponent(this.criteria[0]) + "'&result_type=recent";
      this.secondCriterion = "http://search.twitter.com/search.json?callback=?&rpp=100&q='" + encodeURIComponent(this.criteria[1])  + "'&result_type=recent";
      this.firsts = [];
  
  this.seconds = [];
      this.shortSeconds = [];
      this.pre = "";
      this.post = "";
      this.tweetContent = "";
      //this.tweetQueue = [];
      //this.searchIntervalId = setInterval(this.makeTweetMash, this.searchInterval, this);
      //this.IntervalId = setInterval(this.tweetFromQueue, this.interval, this);
      this.intervalId = setInterval(this.makeTweetMash, this.interval, this);
  }
  else if (this.type === 'reminder') {
    this.tweetQueue = this.tweetQueueFromArray(this);
    this.intervalId = setInterval(this.tweetFromQueue, this.interval, this, this.isRandom);
  }
  else if (this.type === 'youtube') {
    this.queueMax = utils.setArgDefault(this.queueMax, 300);
    this.tweetQueue = [];
    this.inQueue = {};
    this.searchIntervalId = setInterval(this.youtubeFilter, this.searchInterval, this);
    this.intervalId = setInterval(this.tweetFromQueue, this.interval, this, this.isRandom);
  }
  else if (this.type === 'snowclone') {
    for (var w in this.words) {
      this[w + 's'] = {};
    }
    this.template = _.template(this.format);
    this.populateRandomWords(this); //Initial population of the random word pools.
    this.searchIntervalId = setInterval(this.populateRandomWords, this.searchInterval, this);
    this.intervalId = setInterval(this.makeSnowclone, this.interval, this);
  }

  Bot.bots[this.handle] = this;
}

Bot.prototype.tweetQueueFromArray = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);

  var tweetQueue = bot.tweetQueue || [],
      prefix = bot.prefix || '',
      suffix = bot.suffix || '',
      contentPool = bot.contentPool;
      
  contentPool.forEach(function (t) {
    tweetQueue.push( {status: prefix + t + suffix});
  });
  
  return tweetQueue;
};

//A generic function for returning a request() call wrapped in a jQuery-style promise
//The promiseOptions parameter is a call to the PromiseConfig construcor/object cache in PromiseConfig.js
Bot.prototype.makeRequestPromise = function makeRequestPromise(url, bot, promiseOptions) {
  bot = utils.setArgDefault(bot, this, Bot);
  promiseOptions = utils.setArgDefault(PromiseConfig(promiseOptions), PromiseConfig('promiseDefaults'));
  var pDeferred = _.Deferred(),
      thePromise = pDeferred.promise(),
      options = promiseOptions;
      
  //console.log('Using promiseOptions:', options);
  
  request({
    url: url
  }, function(error, response, body) {
    console.log('Got response for', url);
    if (options.validate.call(options, error, response, body)) {
      //console.log("Resolving promise for", url);
      //console.log("with", body.substr(0, 200), '...')
      //console.log("Processing with:", options.processBody);
      pDeferred.resolve(options.processBody.call(options, body)); 
    }
    else {
      console.log("Rejecting Promise for ", url);
      pDeferred.reject(options.onError.call(options, error)); 
    }
  });
  
  return thePromise;
};

Bot.prototype.makeChartLyricsPromise = function makeChartLyricsPromise(url, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return bot.makeRequestPromise(url, bot, 'chartLyricsAPI');
};

Bot.prototype.makeOhhlaLyricPromise = function(url, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return bot.makeRequestPromise(url, bot, 'ohhlaSong');
};

Bot.prototype.makeFlickrPromise = function makeFlickrPromise(url, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return bot.makeRequestPromise(url, bot);
};

//We'll go to specified page, extract all links that end in .txt
//return one at random, prepended with "http://ohhla.com/"
//Works for: most.html, newlyrics.html, and Favorite Artists' pages
Bot.prototype.makeRandomOhhlaSongPromise = function makeRandomOhhlaSongPromise(url, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  url = utils.setArgDefault(url, 'http://ohhla.com/most.html');
  return bot.makeRequestPromise(url, bot, 'ohhlaList');
};

//Scrape the ohhla "favorite artists" page for links of type 'YFA_.+?\.html'
//return one at random, prepended with 'http://ohhla.com/'
Bot.prototype.makeRandomFavoriteOhhlaPromise = function makeRandomFavoriteOhhlaPromise(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return bot.makeRequestPromise('http://ohhla.com/favorite.html', bot, 'ohhlaFaves');
};

Bot.prototype.makeRandomCowboyArtistPromise = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var artistIndex = "http://www.cowboylyrics.com/" + 
                    utils.randomFromArray(['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','19']) +
                    ".html";
  return bot.makeRequestPromise(artistIndex, bot, 'cowboyIndex');
};

Bot.prototype.makeRandomCowboySongPromise = function(artistPage, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return bot.makeRequestPromise(artistPage, bot, 'cowboyArtist');
};

Bot.prototype.makeCowboyLyricPromise = function(songURL, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return bot.makeRequestPromise(songURL, bot, 'cowboySong');
};

Bot.prototype.makeRandomAzArtistPromise = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var artistIndex = "http://www.azlyrics.com/" + 
                    utils.randomFromArray(['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','19']) +
                    ".html";
  return bot.makeRequestPromise(artistIndex, bot, 'azIndex');
};

Bot.prototype.makeRandomAzSongPromise = function(artistPage, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return bot.makeRequestPromise(artistPage, bot, 'azArtist');
};

Bot.prototype.makeAzLyricPromise = function(songURL, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return bot.makeRequestPromise(songURL, bot, 'azSong');
};

//Reconsider the flow here to work with the generic makeRequestPromise function?
Bot.prototype.makeRandomWordsPromise = function(wordHandle, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var reqParams = querystring.stringify(bot.words[wordHandle]),
      api_key = bot.wordnik.api_key,
      url = "http://api.wordnik.com//v4/words.json/randomWords?" + reqParams + "&api_key=" + api_key,
      pool = wordHandle + 's',
      rwDeferred = _.Deferred(),
      randomWordPromise = rwDeferred.promise();
      
  request({
    url: url
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      rwDeferred.resolve(JSON.parse(body), pool, bot);
    }
    else {
      console.log(error);
      rwDeferred.reject(error);
    }
  });
  
  return randomWordPromise;
};

Bot.prototype.populateRandomWords = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  
  var w, 
      words = bot.words;
  
  for (w in words) {
    bot.makeRandomWordsPromise(w, bot)
    .done(bot.moveWordsToPool);
  }
};

Bot.prototype.moveWordsToPool = function moveWordsToPool(list, pool, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
      //pool = result.pool,
      //list = result.list;
  
  _.each(list, function(val, ind, arr) {
    var word = val.word;
    bot[pool][word] = word;
  });
  console.log(pool, ': ', JSON.stringify(bot[pool]));
};

Bot.prototype.getWordnikURLs = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  var w,
      words = bot.words,
      api_key = bot.wordnik.api_key,
      toReturn = {};
      
  for (w in words) {
    toReturn[w] = "http://api.wordnik.com//v4/words.json/randomWords?" + words[w] + "&api_key=" + api_key;
    console.log(w, 'url: ', toReturn[w]);
  }
  
  return toReturn;
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
      youtubePromise = bot.makeRequestPromise(youtubeURL, bot);
  
  _.when(youtubePromise)
  .done(function(data) {
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
    //TODO: Clear from inQueue[] -- can tweetQueue hold {status: , cacheId: } safely?
    if (tweetQueue.length > queueMax) {
        tweetQueue = tweetQueue.slice(queueMax - 50);
    }    
  });
};

Bot.prototype.secondFilter = function secondFilter (data, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  data = JSON.parse(data);

  var T = bot.T,
      pivot = bot.pivot,
      firsts = bot.firsts,
      results = data.results,
      pre = bot.pre,
      post = bot.post,
      tweetContent = bot.tweetContent,
      seconds = bot.seconds,
      shortSeconds = bot.shortSeconds,
      
      i, ii,
      text,
      secondfirst = true;

  // for each latour tweet, find the ones with ' and ' or a comma, and then only if the and or the comma
  // appear somewhat in the middle (30-90 characters). push those to the latours array.
  // OR if the whole latour tweet is less than 50 chars, we can prepend 'and' to it and push it to latoursShort
  for (i = 0, ii = results.length; i < ii; i++) {
    text = results[i].text;
    //console.log(text);

    if (text.indexOf(pivot) !== -1) { // || text.indexOf(', ') !== -1) {
      if ((text.indexOf(pivot) < 90 && text.indexOf(pivot) > 30)) { // || (text.indexOf(', ') < 90 && text.indexOf(', ') > 30)) {
        seconds.push(text);
      }
    }
    else if (text.length < 50) {
      //console.log(text);
      shortSeconds.push(pivot + text.toLowerCase());
    }
  }

  // OKAY now we have 'swags', an array containing a subset of swag tweets with 'and' in them,
  // and 'latours', an array containing a subset of @latourbot tweets with 'and' or ','

  console.log(seconds.length);


  // now we randomize whether tweet takes the form "@latourbot and #swag" or "#swag and @latourbot"
  text = "";
  if (Math.random() < 0.5) {
    secondfirst = false;
  }

  // here we either pick a random latour or a random swag to start the tweet with
  if (secondfirst) {
    text = seconds[Math.floor(Math.random() * seconds.length)];
  }
  else {
    text = firsts[Math.floor(Math.random() * firsts.length)];
  }

  // by definition this will either have 'and' or a comma, so we grab all the text up to but not including
  // the conjunction. 'and' takes precedence because it allows for more natural sounding results
  // we call it 'pre' because it's the prefix

  if (text.indexOf(pivot) !== -1) {
    pre = text.substr(0, text.indexOf(pivot));
  }
  
  //else if (text.indexOf(', ') !== -1) {
  //  pre = text.substr(0, text.indexOf(', '));
  //}

  // now we pick a random latour or a random swag for end of our tweet

  if (secondfirst) {
    text = firsts[Math.floor(Math.random() * firsts.length)];
  }
  else {
    // this is just adding on those < 50 char latour quips since it only matters in the postfix context, not the prefix
    seconds = seconds.concat(shortSeconds);
    text = seconds[Math.floor(Math.random() * seconds.length)];
  }

  // this time we extract the second half of the source tweet and put it in 'post'
  if (text.indexOf(pivot) !== -1) {
    post = text.substr(text.indexOf(pivot) + 5, 140);
  }
  //else if (text.indexOf(', ') !== -1) {
  //  post = text.substr(text.indexOf(', ') + 2, 140);
  //}

  // our tweet is joined on an " and " -- every @latourswag tweet has the word "and" in it!
  tweetContent = pre + " and " + post;
  // strip out URLs and usernames
  tweetContent = tweetContent.replace(/(https?:\/\/[^\s]+)/g, '');
  tweetContent = tweetContent.replace(/@[a-zA-Z0-9_]+/g, '');
  // decode any escaped characters so that '&lt;' will show as '<', etc
  tweetContent = ent.decode(tweetContent);
  // truncate to 140 chars so twitter doesn't reject it (most tweets are < 140 but some aren't)
  tweetContent = tweetContent.substr(0, 140);
  console.log(tweetContent);
  //console.log(tweetContent.length);

  // tweet it!    
  utils.postTweet(T, tweetContent);
};


Bot.prototype.firstFilter = function firstFilter (data, bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  data = JSON.parse(data);
  
  var results = data.results,
      firsts = bot.firsts,
      pivot = bot.pivot,
      secondCriterion = bot.secondCriterion,
      i, ii,
      text;

  // look at each result and push it to an array called 'swags' if it is not an RT and ' and ' appears
  // more than 20 characters into the tweet
  for (i = 0, ii = results.length; i < ii; i++) {
    text = results[i].text;
    if (text.indexOf(pivot) !== -1 && text.indexOf('RT') == -1 && text.indexOf(pivot) > 20) {
      firsts.push(text);
    }
  }
  console.log(firsts.length);
  // get the latour tweets
  //TODO: Replace with request() call (wrapped in promise?)
  restclient.get(secondCriterion, function(data) {
    bot.secondFilter.call(bot, data);
  });
};


//Based on Darius K's @LatourSwag bot source
Bot.prototype.makeTweetMash = function makeTweetMash(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  
  // get the swag tweets, then the latour tweets, then mash together. 
  // TODO: replace with request() call (wrapped in promise?)
  restclient.get(bot.firstCriterion, function(data) {
    bot.firstFilter.call(bot, data);
  });
};

//Search 100 recent tweets for those with certain number of syllables
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
          tweetContent = ent.decode(prefix + text + suffix);
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
Bot.prototype.tweetFromQueue = function(bot, isRandom) {
  bot = utils.setArgDefault(bot, this, Bot);
  
  var T = bot.T,
      tweetQueue = bot.tweetQueue,
      queuedTweet;
  
  if (isRandom) {
    queuedTweet = utils.randomFromArray(bot.tweetQueue);
  }
  else {
    queuedTweet = tweetQueue.shift();
  }
      

  if (typeof queuedTweet === 'undefined') {
      return;
  }
  else {
    utils.postTweet(T, queuedTweet);
  }
};

Bot.prototype.ohhlaRandomTop30Lyric = function ohhlaRandomTop30Lyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  bot.makeRandomOhhlaSongPromise(null, bot).pipe(function(songURL) {
            return bot.makeOhhlaLyricsPromise(songURL, bot);
          });
};

Bot.prototype.ohhlaRandomFaveLyric = function ohhlaRandomFaveLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  bot.makeRandomFavoriteOhhlaPromise(bot).pipe(function (artistPage) {
            return bot.makeRandomOhhlaSongPromise(artistPage, bot).pipe(function (songURL) {
              return bot.makeOhhlaLyricPromise(songURL, bot);
            });
          });
};

Bot.prototype.cowboyRandomLyric = function cowboyRandomLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  bot.makeRandomCowboyArtistPromise(bot).pipe(function (artistURL) {
            return bot.makeRandomCowboySongPromise(artistURL, bot).pipe(function (songURL) {
              return bot.makeCowboyLyricPromise(songURL, bot);
            });
          });
};

Bot.prototype.azRandomLyric = function azRandomLyric(bot) {
  bot = utils.setArgDefault(bot, this, Bot);
  return  bot.makeRandomAzArtistPromise(bot).pipe(function (artistURL) {
            return bot.makeRandomAzSongPromise(artistURL, bot).pipe(function (songURL) {
              return bot.makeAzLyricPromise(songURL, bot);
            });
          });
};

//Main function for bots of type 'lyrpictweet'
Bot.prototype.makeLyrpicTweet = function(bot) {
  bot = utils.setArgDefault(bot, this, Bot);

  var T = bot.T,
      tweetContent = '',
      lyricPromise,
      flickrPromise = bot.makeFlickrPromise(bot.getFlickrURL(bot), bot);
      
      if (bot.lyricType === 'rap') {
        lyricPromise  = bot.ohhlaRandomFaveLyric(bot);
      }
      else if (bot.lyricType === 'country') {
        //TODO: Build in some error catching (404, no links to songs on artist page...)
        lyricPromise = bot.cowboyRandomLyric(bot);
      }
      else {
        lyricPromise = bot.azRandomLyric(bot);
      }
  
  _.when(lyricPromise, flickrPromise)
  .then(function(fullLyric, flickrResponse) {
    console.log('Got both promises fulfilled for', bot.handle);
    //console.log('fullLyric: ', fullLyric);
    //fullLyric = fullLyric.split('\n');
    var rhymes = [],
        randomPhotoIndex = Math.floor(Math.random() * 100), // * flickrResponse.photos.photo.length instead? In case fewer than 100?
        randomPhoto = flickrResponse.photos.photo[randomPhotoIndex],
        picURL = 'http://flickr.com/' + randomPhoto.owner + '/' + randomPhoto.id + '/';         //compose (non-pretty) URL to Flickr image

    //Call the meat of our logic: crawling through lines to find tweet-sized chunks with rhymes, and then pick a random one.
    rhymes = Word.findRhymes(fullLyric);
    tweetContent += utils.randomFromArray(rhymes);
    //We'll bail out of this function if no lyric is returned.
    if (tweetContent === null || tweetContent === '' || typeof tweetContent === 'undefined') { 
      console.log('No lyric found! RETURNING 0');
      return 0;
    }
    
    console.log("Got a rhyme for ", bot.handle);
    //append the Flickr URL to our tweet and output to log for reference
    tweetContent += ' ' + picURL;

    //Only tweet if in production environment
    utils.postTweet(T, tweetContent);
  },
  function(err) {
    //if at first you don't succeed...
    console.log('Some promise failed for ', bot.handle, '\t\t', err);
    bot.makeLyrpicTweet(bot);
  },
  function(status) {
    console.log("Got status update for a promise:", status);
  });
};

Bot.bots = {};    //Holder for Bot objects

exports.Bot = Bot;