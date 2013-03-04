/*
This node application extracts a random tweet-size lyric (preferably rhyming) from one of specified songs on ChartLyrics, 
pairs it with a random image from Flickr, and then tweets the result.

by Joel McCoy (@BooDooPerson)

Phonemes for rhyming are taken from the CMU Pronouncing Dictionary, made avaiable as node-cmudict by Nathaniel K Smith.
express is used as a placeholder server for fielding HTTP requests. (required by NodeJitsu)
node-restclient is used for making calls to Flickr and YQL.
Originally built atop Darius Kazemi's Metaphor-a-Minute.

Currently used for Twitter bots @GCatPix and @CWDogPix.

*/

var CONFIG      = require('./config.js'),
    _           = require('lodash'),
    restclient  = require('node-restclient'),
    Twit        = require('twit'),
    express     = require('express'),
    app         = express(),
    ent         = require('ent'),
    CMUDict     = require('cmudict').CMUDict,
    cmudict     = new CMUDict(),
    cmuNotFound = [];

// This is present for deployment to nodejitsu, which requires some response to http call.
app.get('/', function(req, res){
    res.send('IGNORE ME.');
});
app.listen(process.env.PORT || 3000);

//The cmudict module takes ~2sec on initial query; let's get that out of the way now.
cmudict.get('initialize');

//Every 12 hours, dump a list of words that CMUDict couldn't parse to the log and reset the list
setInterval(function() {
  console.log(cmuNotFound);
  cmuNotFound = [];
},60000*60*12);

//Returns a 'random' element from an array
function randomFromArray(arr) {
  if (arr.length) {
    var index = Math.floor(Math.random() * arr.length);
    return arr[index];
  }

  else {return null;}
}

function setArgDefault(arg, defaultValue, type) {
  if (typeof arg === 'undefined') { 
   arg = defaultValue;
  }
  if (typeof type !== 'undefined') {
    if( !(arg instanceof type)) {
      throw(new Error('arg is not required type within ' + arguments.callee.caller.name + '(' + typeof arg + '!==' + type.name + ')'));
    }
  }

  return arg;  
}


//The postTweet utility function requires a node-twit instance and the content of a tweet
//(tweet can be either a string or a node-twit compatible object.)
function postTweet(T, tweet) {
  if (typeof tweet === 'string') {
    tweet = {status: tweet};
  }
  
  if (process.env['NODE_ENV'] === 'production') {
    T.post('statuses/update', tweet, function (err, reply) {
      if (err) {
        console.log('ERROR tweeting: ', JSON.stringify(err));
      }
      else {
        console.log('Successfully tweeted: ', tweet.status);
      }
    });    
  }
  else {
    console.log('Would tweet: ', tweet.status);
  }
}

//Form the request URL for retrieving ChartLyrics API data
function makeChartLyricsURL(song) {
    return 'http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?'
            + 'artist=' + song.artist + '&song=' + song.title;
}

//Creates a YQL query based on the passed URL
function makeYQL(url) {
    var lyricYQL = 'http://query.yahooapis.com/v1/public/yql?q='
                 + encodeURIComponent('select * from xml where url="' + url + '"')
                 + '&format=json';
    return lyricYQL;
}

//Constructor for an object to hold a word and its phonemes from CMUDict
function Word (literal) {
  if (!(this instanceof Word)) {
    return new Word(literal);
  }

  var i, ii;

  this.literal = literal;
  this.phonemes = cmudict.get(literal);

  if (typeof this.phonemes === 'undefined') {
    this.phonemes = null; //Not found in CMUDict!
    cmuNotFound.push(literal); //Add to list of unknown words
  }
  else {
    this.phonemes = this.phonemes.trim().split(' ');  

    //Strip leading consonants only for a strict rhyme
    for (i = 0, ii = this.phonemes.length; i < ii && this.phonemes[i].match(/^[^AEIOU]/i); i++);
    this.rhymeStrict = this.phonemes.slice(i);

    //Phonemes for last vowel sound through end of word for a greedy rhyme
    for (i = this.phonemes.length - 1; i > 0 && this.phonemes[i].match(/^[AEIOU]/i); i--);
    this.rhymeGreedy = this.phonemes.slice(--i);
  }

  Word.words[this.literal] = this;
}

Word.prototype.toString = function() {
  return this.literal;
};

//Count syllables basde on phonemes (ARPABET format from CMUDict) in Word object
//Sets .syllableCount on Word and also returns the count (or null)
Word.prototype.countSyllables = function() {
  var word = this,
      p, pp,
      first;

  if (word.phonemes === null) {
    //Add a fallback to Wordnik API here?
    word.syllableCount = null;
  } 
  else {
    for (p = 0, pp = word.phonemes.length, word.syllableCount = 0; p < pp; p++) {
      first = word.phonemes[p].charAt(0);
      if  (first == 'A' ||
           first == 'E' ||
           first == 'I' ||
           first == 'O' ||
           first == 'U') {
        word.syllableCount++;
      }
    }
  }

  return word.syllableCount;
};

Word.words = {};    //Holder for caching Word objects

//Send in the bots
function Bot (botConfig) {
  if (!(this instanceof Bot)) {
    return new Bot(botConfig);
  }

  var p, key;

  for (p in botConfig) {
    this[p] = botConfig[p];
  }

  this.T = new Twit(this.twitter);
  
  //Specialized setup by type (TODO: move to Child constructors)
  if (this.type === 'lyrpictweet') {
      
    if (typeof this.artists === 'undefined') {
      this.artists = [];
      for (key in this.songs) {
        this.artists.push(key);
      }
    }
    
    this.intervalId = setInterval(this.makeLyrpicTweet, this.interval, this);
    
  }
  else if (this.type === 'syllablecount') {    
    this.queueMax = setArgDefault(this.queueMax, 300);
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
    this.queueMax = setArgDefault(this.queueMax, 300);
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
  bot = setArgDefault(bot, this, Bot);

  var tweetQueue = bot.tweetQueue || [],
      prefix = bot.prefix || '',
      suffix = bot.suffix || '',
      contentPool = bot.contentPool;
      
  contentPool.forEach(function (t) {
    tweetQueue.push( {status: prefix + t + suffix});
  });
  
  return tweetQueue;
};

Bot.prototype.getArtistTitlePair = function(bot) {
  bot = setArgDefault(bot, this, Bot);

  var artist = randomFromArray(bot.artists),
      title = randomFromArray(bot.songs[artist]);
  return {"artist": artist, "title": title};
};

Bot.prototype.populateRandomWords = function(bot) {
  bot = setArgDefault(bot, this, Bot);
  
  var w, 
      words = bot.words,
      wordnikURLs = bot.getWordnikURLs(),
      wordnikURL = '';
  
  for (w in words) {
    wordnikURL = wordnikURLs[w];
    restclient.get(wordnikURL, function(data) {
      //data = JSON.parse(data);
      _.each(data, function(el, ind, arr) {
        console.log(JSON.stringify(el));
        console.log('bot[', w, 's][', el.word, ']  = ', el.word);
        bot[w + 's'][el.word]  = el.word;
      });
      console.log(w + 's: ', JSON.stringify(bot[w +'s']));
    });
  }
};

Bot.prototype.getWordnikURLs = function(bot) {
  bot = setArgDefault(bot, this, Bot);
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
  bot = setArgDefault(bot, this, Bot);
  var w,
      forTemplate = {},
      template = bot.template,
      words = bot.words,
      T = bot.T,
      wordPool, aWord,
      tweetContent = '';
      
  for (w in words) {
    wordPool = bot[w + 's'];
    aWord = randomFromArray(_.toArray(wordPool));
    forTemplate[w] = aWord;
    delete wordPool[aWord];
  }

  tweetContent = template(forTemplate);
  postTweet(T, tweetContent);
};

Bot.prototype.getYoutubeURL = function(bot) {
  bot = setArgDefault(bot, this, Bot);
  var criteria = bot.criteria,
      youtubeURL = 'http://gdata.youtube.com/feeds/api/videos?q=' + criteria +
                   '&orderby=published&v=2&alt=json';
                   
  return youtubeURL;
};

// Retrieve page somewhere 1-41 from Flickr photos with particular tags and
// CC or more liberal license, sorted by relevance:
Bot.prototype.getFlickrURL = function (bot, pageCount) {
  bot = setArgDefault(bot, this, Bot);
  pageCount = setArgDefault(pageCount, 41);
  
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
  bot = setArgDefault(bot, this, Bot);
  var youtubeURL = bot.getYoutubeURL();
  
  restclient.get(youtubeURL, function (data) {
    data = JSON.parse(data);
    
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
    if (tweetQueue.length > queueMax) {
        tweetQueue = tweetQueue.slice(queueMax - 50);
    }
  });
}

Bot.prototype.secondFilter = function secondFilter (data, bot) {
  bot = setArgDefault(bot, this, Bot);
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
  postTweet(T, tweetContent);
};


Bot.prototype.firstFilter = function firstFilter (data, bot) {
  bot = setArgDefault(bot, this, Bot);
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
  restclient.get(secondCriterion, function(data) {
    bot.secondFilter.call(bot, data);
  });
};


//Based on Darius K's @LatourSwag bot source
Bot.prototype.makeTweetMash = function makeTweetMash(bot) {
  bot = setArgDefault(bot, this, Bot);
  
  // get the swag tweets, then the latour tweets, then mash together. 
  restclient.get(bot.firstCriterion, function(data) {
    bot.firstFilter.call(bot, data);
  });
};

Bot.bots = {};    //Holder for Bot objects

//Working now? Want to be more flexible, though.
function isRhymeInArray(words) {
  var w = 0, ww = words.length,
      word = null,
      toCompare = '',
      rhymeFound = false;

  for (; w < ww; w += 1) {
    word = words[w];
    
    if (word instanceof String) {
      word = new Word(word);
    }

    if (word.phonemes) {
      //console.log('words[' + w + ']: ' + words[w]);
      toCompare = word.rhymeGreedy.join(' ').replace(/\d/g,'');                                 //Strip numbers for looser vowel matching
      
      rhymeFound = words.some(function(el, ind, arr) {
        if (typeof el.rhymeGreedy === 'undefined' || el.literal === word.literal) {
          return false;
        } 
        else {
          return (toCompare === el.rhymeGreedy.join(' ').replace(/\d/g,''));
        }
      });

      if (rhymeFound) return true;
    }
  }

  //After going through the array of words, no rhyming pair was found.
  return false;
}

function findRhymes(fullLyric) {
  var l = 0, ll = fullLyric.length,
      line          = '',
      lastWord      = '',
      theRhymes     = [],
      nonRhymes     = [],
      wordsToRhyme  = [],
      tweetLyric    = '',
      cleanupRE     = /[\[\}].+?[\]\}]|[\[\(\{]?(x\d+|\d+x)[\)\]\}]?|&.+?;|^\(|\)$/gi;

  for (; l<ll; l++) {
    line = fullLyric[l].replace(cleanupRE,'').trim();

    if (line.length > 1 && line[line.length - 1] != ':' && line[line.length - 1] != ']') {  //Try to omit lines like "CHORUS:" and "[x3]"
    
      //Get last word in line as Word object
      lastWord = line.match(/[\S]+$/)[0].replace(/\W/g,'').toUpperCase();
      lastWord = Word.words[lastWord] || new Word(lastWord);
    
      if (wordsToRhyme.length === 0) {                                                      //If first line in a new tweetable cluster:
        tweetLyric = line;                                                                       //|-set this line as the root for a new potential tweet
        wordsToRhyme = [lastWord];                                                          //|-seed grouping of words to check for rhyme with last word
      } 
      else {                                                                              //Otherwise...
        if (tweetLyric.length + line.length + 3 <= 117) {                                        //|-If existing + this + link will fit in a tweet:
            tweetLyric += ' / ' + line;                                                          //|-Add this line to the potential tweet body

            if (l+1 < ll && tweetLyric.length + fullLyric[l+1].length + 3 > 117) {
              wordsToRhyme.push(lastWord);
              (wordsToRhyme.length > 1 && isRhymeInArray(wordsToRhyme)) ? theRhymes.push(tweetLyric) : nonRhymes.push(tweetLyric);
              tweetLyric = line;
              wordsToRhyme = [lastWord];
            }
            else {
              wordsToRhyme.push(lastWord);
            }
        } 
        else {                                                                            //|-If existing + this + link will be too long to tweet
          (wordsToRhyme.length > 1 && isRhymeInArray(wordsToRhyme)) ? theRhymes.push(tweetLyric) : nonRhymes.push(tweetLyric);
          tweetLyric = line;
          wordsToRhyme = [lastWord];
        }
      }
    }
  }

  //Return array of chunks with rhymes, or all the chunks found if none have known rhymes.
  if (theRhymes.length > 0) {
    return theRhymes;
  } 
  else {
    return nonRhymes;
  }
}

//Search 100 recent tweets for those with certain number of syllables
Bot.prototype.syllableFilter = function(bot) {
  bot = setArgDefault(bot, this, Bot);

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
  bot = setArgDefault(bot, this, Bot);
  
  var T = bot.T,
      tweetQueue = bot.tweetQueue,
      queuedTweet;
  
  if (isRandom) {
    queuedTweet = randomFromArray(bot.tweetQueue);
  }
  else {
    queuedTweet = tweetQueue.shift();
  }
      

  if (typeof queuedTweet === 'undefined') {
      return;
  }
  else {
    postTweet(T, queuedTweet);
  }
};

//Main function for bots of type 'lyrpictweet'
Bot.prototype.makeLyrpicTweet = function(bot) {
  bot = setArgDefault(bot, this, Bot);

  var T = bot.T,
      tweetContent = '',
      artistAndTitle = bot.getArtistTitlePair(),
      yql = makeYQL(makeChartLyricsURL(artistAndTitle));
  
  console.log(artistAndTitle);

  restclient.get(yql,function(data){
    if(data.query && data.query.results && data.query.results.GetLyricResult){
      var rhymes = [],
          flickrURL,
          picURL = '',
          fullLyric = data.query.results.GetLyricResult.Lyric.replace(/&amp;quot;/gi,'"').split('\n'); //Array of lyrics, split by newline

      //Call the meat of our logic: crawling through lines to find tweet-sized chunks with rhymes, and then pick a random one.
      rhymes = findRhymes(fullLyric);
      tweetContent += randomFromArray(rhymes);

      //We'll bail out of this function if no lyric is returned.
      if (tweetContent === '' || typeof tweetContent === 'undefined') { 
        return 0;
      }

      //Then go get Flickr URL (using 'tags' from Bot)
      flickrURL = bot.getFlickrURL();
      restclient.get(flickrURL,function(animData) {
        //Grab one of the 100 photos on this page at "random"
        var randomPhotoIndex = Math.floor(Math.random() * 100), // * animData.photos.photo.length instead? In case fewer than 100?
            randomPhoto = animData.photos.photo[randomPhotoIndex];
            picURL = 'http://flickr.com/' + randomPhoto.owner + '/' + randomPhoto.id + '/';         //compose (non-pretty) URL to Flickr image

        //append the Flickr URL to our tweet and output to log for reference
        tweetContent += ' ' + picURL;

        //Only tweet if in production environment
        postTweet(T, tweetContent);
      }, "json");
    }
    else {
      console.log('ERROR! No lyrics in GET response. (Timeout? Bad request?)');
      try {
          bot.makeLyrpicTweet();
        }
        catch (e) {
          console.log(e);
        }
    }
  }, "json");
};

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