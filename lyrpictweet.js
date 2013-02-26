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

var restclient  = require('node-restclient'),
    CONFIG      = require('./config.js'),
    Twit        = require('twit'),
    express     = require('express'),
    app         = express(),
    CMUDict     = require('cmudict').CMUDict,
    cmudict     = new CMUDict(),
    cmuNotFound = [];

// This is present for deployment to nodejitsu, which requires some response to http call.
app.get('/', function(req, res){
    res.send('IGNORE ME.');
});
app.listen(3000);

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

//Form the request URL for retrieving ChartLyrics API data
function makeChartLyricsURL(song) {
    return 'http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?'
            + 'artist=' + song.artist + '&song=' + song.title;
}

function makeYQL(url) {
    var lyricYQL = 'http://query.yahooapis.com/v1/public/yql?q='
                 + encodeURIComponent('select * from xml where url="' + url + '"')
                 + '&format=json';
    return lyricYQL;
}

//Send in the bots
function Bot (botConfig) {
  if (!(this instanceof Bot)) {
    return new Bot(botConfig);
  }

  var p, key;

  for (p in botConfig) {
    this[p] = botConfig[p];
  }

  if (typeof this.artists === 'undefined') {
    this.artists = [];
    for (key in this.songs) {
      this.artists.push(key);
    }
  }

  console.log(JSON.stringify(this.tags));
  this.T = new Twit(this.twitter);
  this.intervalId = setInterval(makeLyrpicTweet, this.interval, this);

  Bot.bots[this.handle] = this;
}

Bot.prototype.getArtistTitlePair = function() {
  var artist = randomFromArray(this.artists),
      title = randomFromArray(this.songs[artist]);
  return {"artist": artist, "title": title};
};

// Retrieve page somewhere 1-41 from Flickr photos with particular tags and
// CC or more liberal license, sorted by relevance:
Bot.prototype.getFlickrURL = function (pagecount) {
  if (typeof pageCount === 'undefined') {
    pageCount = 41;
  }
  
  var randomPage =  Math.floor((Math.random() * pageCount) + 1),
      flickrURL  =  "http://api.flickr.com/services/rest/?method=flickr.photos.search&" +
                    "api_key=" + this.flickr.flickr_key + "&" +
                    "tags=" + this.tags + "&" +
                    "license=1%7C2%7C3%7C4%7C5%7C6%7C7%7C8&" +
                    "sort=relevance&" +
                    "safe_search=1&" +
                    "content_type=1&" +
                    "page=" + randomPage + "&" +
                    "format=json&" +
                    "nojsoncallback=1";
  
  return flickrURL;
};

Bot.bots = {};    //Holder for Bot objects

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
  } else {
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

Word.prototype.countSyllables = function() {
  var p, pp,
      first;

  if (this.phonemes === null) {
    //Add a fallback to Wordnik API here?
    this.syllableCount = null;
  } else {
    for (p = 0, pp = this.phonemes.length, this.syllableCount = 0; p < pp; p++) {
      first = this.phonemes[p].charAt(0);
      if  (first == 'A' ||
           first == 'E' ||
           first == 'I' ||
           first == 'O' ||
           first == 'U') {
        this.syllableCount++;
      }
    }
  }

  return this.syllableCount;
};

Word.words = {};    //Holder for caching Word objects

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
      cleanupRE     = /[\[\}].+?[\]\}]|[\[\(\{]?(x\d+|\d+x)[\)\]\}]?|&.+?;/gi;

  for (; l<ll; l++) {
    line = fullLyric[l].replace(cleanupRE,'').trim();
    if (line.length < 2) {
      continue;                                                                             //No content, move along
    }
    
    //Get last word in line as Word object
    lastWord = line.match(/[\S]+$/)[0].replace(/\W/g,'').toUpperCase();
    lastWord = Word.words[lastWord] || new Word(lastWord);

    if (line[line.length - 1] != ':' && line[line.length - 1] != ']') {                     //Try to omit lines like "CHORUS:" and "[x3]"
      if (wordsToRhyme.length === 0) {                                                      //If first line in a new tweetable cluster:
        tweetLyric = line;                                                                       //|-set this line as the root for a new potential tweet
        wordsToRhyme = [lastWord];                                                          //|-seed grouping of words to check for rhyme with last word
      } else {                                                                              //Otherwise...
        if (tweetLyric.length + line.length + 3 <= 117) {                                        //|-If existing + this + link will fit in a tweet:
            tweetLyric += ' / ' + line;                                                          //|-Add this line to the potential tweet body

            if (l+1 < ll && tweetLyric.length + fullLyric[l+1].length + 3 > 117) {               //|---If this line will be the last in the group
              wordsToRhyme.push(lastWord);                                                  //|-----Add its last word into the rhyme pool
              (wordsToRhyme.length > 1 && isRhymeInArray(wordsToRhyme)) ? theRhymes.push(tweetLyric) : nonRhymes.push(tweetLyric);
              tweetLyric = line;                                                                 //|-----set this line as the root for a new potential tweet
              wordsToRhyme = [lastWord];                                                    //|-----seed grouping of words to check for rhyme with last word
            } else {                                                                        //|---Otherwise...
              wordsToRhyme.push(lastWord);                                                  //|-----Add last word to rhyme pool and move on
            }
        } else {                                                                            //|-If existing + this + link will be too long to tweet
          (wordsToRhyme.length > 1 && isRhymeInArray(wordsToRhyme)) ? theRhymes.push(tweetLyric) : nonRhymes.push(tweetLyric);
          tweetLyric = line;                                                                     //|--set this line as the root for a new potential tweet
          wordsToRhyme = [lastWord];                                                        //|--seed grouping of words to check for rhyme with last word
        }
      }
    }
  }

  //Return array of chunks with tweetLyrics, or all the chunks found if none have known tweetLyrics.
  if (theRhymes.length > 0) {
    return theRhymes;
  } else {
    return nonRhymes;
  }
}

//Search 100 recent tweets
function syllableFilter(targetSyllables, searchParams) {

  if (typeof searchParams === undefined) {
    searchParams  = { 
      "q": 'lang:en', 
      "result-type": 'recent', 
      "count": 100, 
    }
  };

  T.get('search/tweets', searchParams, function(err, reply) {
    if (err) console.log(err);

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
        stripEntities = /[@#].+?[\S]+?\s|[@#][^@#]+$|http:\/\/[\S]+|[,\|\\\/\-\.]+|:\-?[dxpc3be]/gi; //remove mentions, hashtags, and common emoticons

    for (s = 0, ss = reply.statuses.length; s < ss; s++) {
      t = reply.statuses[s];
      text = t.text.replace(stripEntities, '').trim();
      sepCount = (text.match(wordSep) || []).length;
      
      if (text.length + t.user.screen_name + 26 > 140 || sepCount >= targetSyllables || sepCount < 1) {
        //console.log(('REJECTED: ').red);
        //console.log((text).grey);
        continue;               //Quick filter for usable tweets.
      };

      //console.log(('SEEMS LEGIT: ').green)
      //console.log((text).grey)
      sCount = 0;
      tArr = text.replace('-',' ').split(' ');

      for (w = 0, ww= tArr.length; w < ww; w++) {
        if (sCount > targetSyllables) {
          continue;
        };
        
        word = tArr[w].replace(/^\W+|\W+$/g,'').trim();
        if (word == '') {
          continue;
        };
        
        sCount += (new Word(word).countSyllables() || 1000); //intentionally overrun syllable target is no pronunciation found
        if (word === 'our' || word === 'hour') sCount--; //adjust down syllable count where we disagree with CMUDict
        //console.log('+ ' + word + '= ' + sCount);
      }
      if (sCount === targetSyllables) {
        //console.log(('We got one! : ').green);
        console.log(text);
        tweetContent = text + ' / doo-dah, doo-dah…';
        tweetQueue.push({status: tweetContent, in_reply_to_status_id: t.id, });
      }
    }
    //console.log(tweetQueue);
  })
}

//Do the damn thang
function makeLyrpicTweet(bot) {
  var T = bot.T,
      tweetContent = '',
      artistAndTitle = bot.getArtistTitlePair(),
      yql = makeYQL(makeChartLyricsURL(artistAndTitle));
  
  console.log(artistAndTitle);

  restclient.get(yql,function(data){
    if(data.query.results && data.query.results.GetLyricResult && data.query.results.GetLyricResult.Lyric){
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
        console.log(tweetContent);

        //Only tweet if in production environment
        if (process.env.NODE_ENV == 'production') {
          T.post('statuses/update', { status: tweetContent}, function(err, reply) {
            console.log("error: " + err);
            console.log("reply: " + reply);
            console.log('...\n\n');
            });
        }
      }, "json");
    } else {
      console.log('ERROR! No lyrics in GET response. (Timeout? Bad request?)');
      try {
          makeLyrpicTweet(bot);
        }
        catch (e) {
          console.log(e);
        }
    }
  }, "json");
}

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