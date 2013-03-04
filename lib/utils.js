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

exports.randomFromArray = randomFromArray;
exports.setArgDefault = setArgDefault;
exports.postTweet = postTweet;
exports.makeChartLyricsURL = makeChartLyricsURL;
exports.makeYQL = makeYQL;