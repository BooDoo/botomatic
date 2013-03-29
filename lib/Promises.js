var utils         = require('./utils.js'),
    PromiseConfig = require('./PromiseConfig.js'),
    Bot           = require('./Bot.js'),
    request       = require('request'),
    _             = require('lodash');

    _.mixin(require('underscore.deferred'));
    
module.exports = {
  makeTwitterSearchPromise: function makeTwitterSearchPromise(criteria, T, options, tweetPool) {
    var pDeferred = _.Deferred(),
        thePromise = pDeferred.promise();
    
    options = PromiseConfig(options) || PromiseConfig('twitterTextOnly');
    tweetPool = tweetPool || [];
    
    if (typeof criteria === "string") {
      criteria = {q: criteria, count: 100};
    }
    
    // console.log("tweetPool.since_id within makeTwitterSearchPromise:", tweetPool.since_id);
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
  makeRequestPromise: function makeRequestPromise(url, promiseOptions) {
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
  
  makeChartLyricsPromise: function makeChartLyricsPromise(url) {
    return this.makeRequestPromise(url, 'chartLyricsAPI');
  },
  
  makeOhhlaLyricPromise: function makeOhhlaLyricPromise(url) {
    return this.makeRequestPromise(url, 'ohhlaSong');
  },
  
  makeFlickrPromise: function makeFlickrPromise(url) {
    return this.makeRequestPromise(url);
  },
  
  //We'll go to specified page, extract all links that end in .txt
  //return one at random, prepended with "http://ohhla.com/"
  //Works for: most.html, newlyrics.html, and Favorite Artists' pages
  makeRandomOhhlaSongPromise: function makeRandomOhhlaSongPromise(url) {
    url = utils.setArgDefault(url, 'http://ohhla.com/most.html');
    return this.makeRequestPromise(url, 'ohhlaList');
  },
  
  //Scrape the ohhla "favorite artists" page for links of type 'YFA_.+?\.html'
  //return one at random, prepended with 'http://ohhla.com/'
  makeRandomFavoriteOhhlaPromise: function makeRandomFavoriteOhhlaPromise() {
    return this.makeRequestPromise('http://ohhla.com/favorite.html', 'ohhlaFaves');
  },
  
  makeRandomCowboyArtistPromise: function makeRandomCowboyArtistPromise() {
    var artistIndex = "http://www.cowboylyrics.com/" + 
                      utils.randomFromArray(['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','19']) +
                      ".html";
    return this.makeRequestPromise(artistIndex, 'cowboyIndex');
  },
  
  makeRandomCowboySongPromise: function makeRandomCowboySongPromise(artistPage) {
    return this.makeRequestPromise(artistPage, 'cowboyArtist');
  },
  
  makeCowboyLyricPromise: function makeCowboyLyricPromise(songURL) {
    return this.makeRequestPromise(songURL, 'cowboySong');
  },
  
  makeRandomAzArtistPromise: function makeRandomAzArtistPromise() {
    var artistIndex = "http://www.azlyrics.com/" + 
                      utils.randomFromArray(['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','19']) +
                      ".html";
    return this.makeRequestPromise(artistIndex, 'azIndex');
  },
  
  makeRandomAzSongPromise: function makeRandomAzSongPromise(artistPage) {
    return this.makeRequestPromise(artistPage, 'azArtist');
  },
  
  makeAzLyricPromise: function makeAzLyricPromise(songURL) {
    return this.makeRequestPromise(songURL, 'azSong');
  }
};