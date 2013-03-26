var utils         = require('./utils.js'),
    PromiseConfig = require('./PromiseConfig.js'),
    Bot           = require('./Bot.js'),
    request       = require('request'),
    _             = require('lodash');

    _.mixin(require('underscore.deferred'));
    
module.exports = {
  makeTwitterSearchPromise: function makeTwitterSearchPromise(criteria, T, options, tweetPool, bot) {
    var pDeferred = _.Deferred(),
        thePromise = pDeferred.promise();
    
    options = PromiseConfig(options) || PromiseConfig('twitterTextOnly');
    tweetPool = tweetPool || [];
    
    if (typeof criteria === "string") {
      criteria = {q: criteria, count: 100};
    }
    
    console.log("tweetPool.since_id within makeTwitterSearchPromise:", tweetPool.since_id);
    criteria.since_id = criteria.since_id || tweetPool.since_id || 0;
    
    T.get('search/tweets', criteria, function(err, reply) {
      console.log('Got response for', JSON.stringify(criteria));
      if(err) {
        console.log(err);
        pDeferred.reject();
      }
      else {
        tweetPool.since_id = _.max(reply.statuses, "id").id; //Store highest ID for use as "since_id" on subsequent calls
        console.log("I see", reply.statuses.length, "tweets returned, highest id:", tweetPool.since_id);
        pDeferred.resolve(options.processBody.call(options, reply));
      }
    });
    
    return thePromise;
  },
  
  //A generic function for returning a request() call wrapped in a jQuery-style promise
  //The promiseOptions parameter is a call to the PromiseConfig construcor/object cache in PromiseConfig.js
  makeRequestPromise: function makeRequestPromise(url, bot, promiseOptions) {
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
  },
  
  makeChartLyricsPromise: function makeChartLyricsPromise(url, bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    return bot.makeRequestPromise(url, bot, 'chartLyricsAPI');
  },
  
  makeOhhlaLyricPromise: function makeOhhlaLyricPromise(url, bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    return bot.makeRequestPromise(url, bot, 'ohhlaSong');
  },
  
  makeFlickrPromise: function makeFlickrPromise(url, bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    return bot.makeRequestPromise(url, bot);
  },
  
  //We'll go to specified page, extract all links that end in .txt
  //return one at random, prepended with "http://ohhla.com/"
  //Works for: most.html, newlyrics.html, and Favorite Artists' pages
  makeRandomOhhlaSongPromise: function makeRandomOhhlaSongPromise(url, bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    url = utils.setArgDefault(url, 'http://ohhla.com/most.html');
    return bot.makeRequestPromise(url, bot, 'ohhlaList');
  },
  
  //Scrape the ohhla "favorite artists" page for links of type 'YFA_.+?\.html'
  //return one at random, prepended with 'http://ohhla.com/'
  makeRandomFavoriteOhhlaPromise: function makeRandomFavoriteOhhlaPromise(bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    return bot.makeRequestPromise('http://ohhla.com/favorite.html', bot, 'ohhlaFaves');
  },
  
  makeRandomCowboyArtistPromise: function makeRandomCowboyArtistPromise(bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    var artistIndex = "http://www.cowboylyrics.com/" + 
                      utils.randomFromArray(['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','19']) +
                      ".html";
    return bot.makeRequestPromise(artistIndex, bot, 'cowboyIndex');
  },
  
  makeRandomCowboySongPromise: function makeRandomCowboySongPromise(artistPage, bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    return bot.makeRequestPromise(artistPage, bot, 'cowboyArtist');
  },
  
  makeCowboyLyricPromise: function makeCowboyLyricPromise(songURL, bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    return bot.makeRequestPromise(songURL, bot, 'cowboySong');
  },
  
  makeRandomAzArtistPromise: function makeRandomAzArtistPromise(bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    var artistIndex = "http://www.azlyrics.com/" + 
                      utils.randomFromArray(['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','19']) +
                      ".html";
    return bot.makeRequestPromise(artistIndex, bot, 'azIndex');
  },
  
  makeRandomAzSongPromise: function makeRandomAzSongPromise(artistPage, bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    return bot.makeRequestPromise(artistPage, bot, 'azArtist');
  },
  
  makeAzLyricPromise: function makeAzLyricPromise(songURL, bot) {
    bot = utils.setArgDefault(bot, this, Bot);
    return bot.makeRequestPromise(songURL, bot, 'azSong');
  }
};