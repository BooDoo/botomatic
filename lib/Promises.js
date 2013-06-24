var utils         = require('./utils.js'),
    PromiseConfig = require('./PromiseConfig.js'),
    Bot           = require('./Bot.js'),
    request       = require('request'),
    _             = require('lodash'),
    when          = require('when');

module.exports = {
  makeTwitterSearchPromise: function makeTwitterSearchPromise(criteria, T, options, tweetPool) {
    var pDeferred = when.defer(),
        thePromise = pDeferred.promise;

    options = PromiseConfig(options) || PromiseConfig('twitterTextOnly');
    tweetPool = tweetPool || [];

    if (typeof criteria === "string") {
      criteria = {q: criteria, count: 100};
    }

    // console.log("tweetPool.since_id within makeTwitterSearchPromise:", tweetPool.since_id);
    criteria.since_id = criteria.since_id || tweetPool.since_id || 0;

    T.get('search/tweets', criteria, function(err, reply) {
      // console.log('Got response for', JSON.stringify(criteria));
      if(err) {
        console.log(err);
        pDeferred.reject();
      }
      else {
        tweetPool.since_id = utils.incrementTweetId(_.max(reply.statuses, "id").id) || tweetPool.since_id || 0;
        //console.log(reply.statuses.length, "tweets returned, since_id at:", tweetPool.since_id, "for", criteria.q);
        pDeferred.resolve(options.processBody.call(options, reply));
      }
    });

    return thePromise;
  },

  //A generic function for returning a request() call wrapped in a when.js promise
  //The promiseOptions parameter is a call to the PromiseConfig construcor/object cache in PromiseConfig.js
  makeRequestPromise: function makeRequestPromise(url, promiseOptions) {
    promiseOptions = utils.setArgDefault(PromiseConfig(promiseOptions), PromiseConfig('promiseDefaults'));
    var pDeferred = when.defer(),
        thePromise = pDeferred.promise,
        options = promiseOptions;

    request({
      url: url
    }, function(error, response, body) {
      if (options.validate.call(options, error, response, body)) {
        pDeferred.resolve(options.processBody.call(options, body));
      }
      else {
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

  makeRandomWordsPromise: function makeRandomWordsPromise(url) {
    return this.makeRequestPromise(url, 'wordnikRandomWords');
  },

  makePartOfSpeechPromise: function makePartOfSpeechPromise(url) {
    return this.makeRequestPromise(url, 'wordnikPartOfSpeech');
  },

  makePhrasePresPromise: function makePhrasePresPromise(url) {
    return this.makeRequestPromise(url, 'wordnikPhrasePres');
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
