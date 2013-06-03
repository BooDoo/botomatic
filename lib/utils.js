var _ = require('lodash');

module.exports = {
  //Returns a 'random' element from an array
  randomFromArray: function randomFromArray(arr, fullReturn, validateFunc, isDestructive) {
    var toReturn = null;
        validateFunc = validateFunc || function(a) {return true;};

    if (arr !== null && typeof arr !== 'undefined' && arr.length) {
      var index = Math.floor(Math.random() * arr.length);
      if (!fullReturn) {
        toReturn = arr[index];
      }
      else {
        toReturn = {"element": arr[index], "index": index, "array": arr};
      }

      if (validateFunc(toReturn)) {
        return toReturn;
      } else {
        return randomFromArray(arr, fullReturn, validateFunc);
      }

      if (isDestructive) {
        arr = _.without(arr, arr[index]);
      }
      return toReturn;
    }
    else {
      return null;
    }
  },

  setArgDefault: function setArgDefault(arg, defaultValue, type) {
    if (typeof arg === 'undefined' || arg === null) {
     arg = defaultValue;
    }
    if (typeof type !== 'undefined') {
      if( !(arg instanceof type)) {
        throw(new Error('arg is not required type within ' + arguments.callee.caller.name + '(' + typeof arg + '!==' + type.name + ')'));
      }
    }
    return arg;
  },
  //The postTweet utility function requires a node-twit instance and the content of a tweet
  //(tweet can be either a string or a node-twit compatible object.)
  postTweet: function postTweet(T, tweet) {
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
  },

  searchTweets: function searchTweets(T, criteria) {
    if (typeof criteria === 'string') {
      criteria = {"q": encodeURIComponent(criteria)};
    }
    //console.log('Searching with', criteria);
    return T.get('search/tweets', criteria, function(err, reply) {
      if(err) {
        console.log(err);
        return null;
      }
      else {
        return reply;
      }
    });
  },

  //Form the request URL for retrieving ChartLyrics API data
  makeChartLyricsURL: function makeChartLyricsURL(song) {
      return 'http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?'
              + 'artist=' + song.artist + '&song=' + song.title;
  },
  //Creates a YQL query based on the passed URL
  makeYQL: function makeYQL(url) {
      var yqlURL = 'http://query.yahooapis.com/v1/public/yql?q='
                   + encodeURIComponent('select * from xml where url="' + url + '"')
                   + '&format=json';
      return yqlURL;
  },

  customReplace: function customReplace(target, reMatch, reReplace, replaceWith) {
      replaceWith = replaceWith || "";
      target.replace(reMatch, function(pattern,match,pos,source) {
        if (match !== "" && typeof match !== "undefined") {
          target = target.replace(match, match.replace(reReplace,replaceWith));
        }
      });
      return target;
  }
};
