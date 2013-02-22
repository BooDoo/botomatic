/*
	This script takes a random tweet-size lyric (preferably rhyming) from one of the specified songs on ChartLyrics, pairs it 
	with a random image from Flickr, and then tweets the result.

	This was built atop Darius Kazemi's Metaphor-a-Minute. Phonemes for rhyming are taken from the CMU Pronouncing Dictionary, 
	made avaiable as node-cmudict by Nathaniel K Smith. express is used as a placeholder server for fielding HTTP requests. node-restclient is used for making calls to Flickr and YQL.

	Other work by Joel McCoy.

	Currently this is used for Twitter bots @GCatPix and @CWDogPix.
*/

var restclient 	= require('node-restclient'),
		APICONFIG		= require('config.js').credentials,
		Twit 				= (process.env['NODE_ENV'] == 'production' ? require('twit') : {}),	//Only load Twit module if in production
		express 		= require('express'),
		app 				= express(),
		CMUDict 		= require('cmudict').CMUDict,
		cmudict 		= new CMUDict(),
		cmudict.notFound = [];

// If you're running locally you don't need this, or express at all.
// This is present for deployment to nodejitsu, which requires some response to http call.
app.get('/', function(req, res){
		res.send('IGNORE ME.');
});
app.listen(3000);

//The cmudict module takes ~2sec on initial query; let's get that out of the way now.
cmudict.get('initialize');

// Delay between generating Tweets (2/hr in production, 30sec locally)
//var generateDelay = (process.env['NODE_ENV'] == 'production' ? 60000*30 : 30000);

// Using output account's consumer_* keys and App's generated read/write access_* keys 
// Only loaded/used if in production environment
if (process.env['NODE_ENV'] == 'production') {
	var T = new Twit(bot.twitter);
}

//Returns a 'random' element from an array, or just the index to that element.
function randomFromArray(arr) {
	if (arr instanceof Array) {
		var index = Math.floor(Math.random() * arr.length);
		return arr[index];
	}
	else {return -1;}
};

function getArtistTitlePair(songs)
	var artist, title;

	if (typeof songs.artists === 'undefined') {
	  var keys = [],
	  
	  for (var p in songs) {
	    keys.push(p);
	  }

	  songs.artists = keys;
	};

	artist = randomFromArray(songs.artists);
  title = randomFromArray(songs[artist]);

  return {'artist': artist, 'title': title};
}

// Retrieve page somewhere 1-41 from Flickr photos with particular tags and
// CC or more liberal license, sorted by relevance:
function getFlickrURL(tags, flickr_key, pageCount) {
	if (typeof pageCount === 'undefined') {
		pageCount = 41;
	}
  
  var randomPage =  Math.floor((Math.random() * pageCount) + 1),
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
}

//Form the request URL for retrieving ChartLyrics API data through YQL.
function makeYQL(song) {

	var lyricURL = 'http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?'
							 + 'artist=' + song.artist + '&song=' + song.title,

			lyricYQL = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="' + lyricURL + '"') + '&format=json';

	return lyricYQL;
}

//Do the damn thang
function makeLyrpicTweet(bot) {
	var tweetContent = '',
			artistAndTitle = getArtistTitlePair(bot.songs),
			yql = makeYQL(artistAndTitle);
	
	console.log(artistAndTitle);

	var lyricReq = restclient.get(yql,function(data){
		if(data.query.results.GetLyricResult.Lyric){
			var rhymes = [],
					flickrURL,
					picURL = '',
					fullLyric = data.query.results.GetLyricResult.Lyric.replace(/&amp;quot;/gi,'"').split('\n'), //Array of lyrics, split by newline
					animReq = {},

			//Call the meat of our logic: crawling through lines to find tweet-sized chunks with rhymes, and then pick a random one.
			rhymes = findRhymes(fullLyric);
			tweetContent += randomFromArray(rhymes);

			//We'll bail out of this function if no lyric is returned.
			if (tweetContent === '' || typeof tweetContent === 'undefined') { 
				return 0;
			}

			//Then go get the animPicURL (cat or dog, depending on catTurn boolean)
			flickrURL = getFlickrURL(bot.tags, bot.flickr.flickr_key);
			animReq = restclient.get(flickrURL,function(animData) {
				//Grab one of the 100 photos on this page at "random"
				var randomPhotoIndex = Math.floor(Math.random() * 100), // * animData.photos.photo.length instead? In case fewer than 100?
						randomPhoto = animData.photos.photo[randomPhotoIndex];
						picURL = 'http://flickr.com/' + randomPhoto.owner + '/' + randomPhoto.id + '/';					//compose (non-pretty) URL to Flickr image

				//append the Flickr URL to our tweet and output to log for reference
				tweetContent += ' ' + picURL;
				console.log(tweetContent);

				//Only tweet if in production environment
				if (process.env['NODE_ENV'] == 'production') {
					var T = new Twit(bot.twitter);
					T.post('statuses/update', { status: tweetContent}, function(err, reply) {
						console.log("error: " + err);
						console.log("reply: " + reply);
						console.log('...\n\n');
						});
				}
			}, "json");
		} else {
			console.log('DANGER! DANGER! No results for query. (Timeout? Bad request?)');
			try {
					makeLyrpicTweet(bot);
				}
				catch (e) {
					console.log(e);
				}
		}
	}, "json");
}

//Container object for a word to hold its literal content and phonemes from CMUDict
function Word(literal) {
	if (!(this instanceof Word)) {
		return new Word(literal);
	}

  var i, ii;

  this.literal = literal;
	this.phonemes = cmudict.get(literal);

	if (typeof this.phonemes === 'undefined') {
		this.phonemes = null; //Not found in CMUDict!
		cmudict.notFound.push(literal); //Add to list of unknown words
	} else {
		this.phonemes = this.phonemes.trim().split(' ');  
	  this.start = this.phonemes[0];
	  this.end = this.phonemes[this.phonemes.length - 1];

	  //Strip leading consonants only for a strict rhyme
		for (var i = 0, ii = this.phonemes.length; i < ii && this.phonemes[i].match(/^[^AEIOU]/i); i++);
		this.rhymeStrict = this.phonemes.slice(i);

		//Phonemes for last vowel sound through end of word for a greedy rhyme
		for (var i = this.phonemes.length - 1; i >= 0 && this.phonemes[i].match(/^[AEIOU]/i); i--);
		this.rhymeGreedy = this.phonemes.slice(--i);

		//If asking for a string of the word, pass its non-phonetic version
	  this.toString= function() {
	      return this.literal;
	  };

	}
}

//Working now? Want to be more flexible, though.
function rhymeInArray(words) {
	for (var w = 0, ww = words.length; w < ww; w++) {
		if (typeof words[w] != 'object') {
			continue;
		}

		else {
			//console.log('words[' + w + ']: ' + words[w]);
			var match = words[w].rhymeGreedy.join(' ').replace(/\d/g,'');																	//Strip numbers to be loose with vowel sound matching
			
			var matchFound = words.some(function(el, ind, arr) {
				if (typeof el.rhymeGreedy == 'undefined' || el.literal == words[w].literal) {
					return false;
				} 
				else {
					if (match == el.rhymeGreedy.join(' ').replace(/\d/g,'')) {
						return match == el.rhymeGreedy.join(' ').replace(/\d/g,'');
					}
				}
			});

			if (matchFound) return true;
		}
	}

	//After going through the array of words, no rhyming pair was found.
	return false;
}

function findRhymes(fullLyric) {
	var theRhymes 		= [],
			noRhymes 			= [],
			wordsToMatch 	= [],
			rhyme 				= '',
			myWords 			= {};

	for (var l=0, ll=fullLyric.length - 1; l<ll; l++) {
		var line = fullLyric[l].replace(/[\[\}].+?[\]\}]|[\[\(\{]?(x\d+|\d+x)[\)\]\}]?|&.+?;/gi,'').trim();
		if (line.length < 2) {
			continue;																																							//No content, move along
		}
		
		//Either get existing Word object, or make new one from the last word in this line
		var lastWord = line.match(/[\S]+$/)[0].replace(/\W/g,'').toUpperCase();
		asWord = myWords[lastWord] || Word(lastWord, cmudict.get(lastWord));
		if (typeof asWord == 'undefined') {
			//cmuNotFound.push(lastWord);																														//No pronunciation data in CMUDict; put in a pile
		} else {
			lastWord = asWord;																																		//Otherwise, store Word object for comparison/rhyming
		}
		

		if (line[line.length - 1] != ':' && line[line.length - 1] != ']') {											//Try to omit lines like "CHORUS:" and "[x3]"
			if (wordsToMatch.length === 0) {																											//If first line in a new tweetable cluster:
				rhyme = line;																																				//|-set this line as the root for a new potential tweet
				wordsToMatch = [lastWord];																													//|-seed grouping of words to check for rhyme with last word
			} else {																																							//Otherwise...
				if (rhyme.length + line.length + 3 <= 117) {                                        //|-If existing + this + link will fit in a tweet:
						rhyme += ' / ' + line;																													//|-Add this line to the potential tweet body

						if (l+1 < ll && rhyme.length + fullLyric[l+1].length + 3 > 117) {               //|---If this line will be the last in the group
							wordsToMatch.push(lastWord);																									//|-----Add its last word into the rhyme pool
							(wordsToMatch.length > 1 && rhymeInArray(wordsToMatch)) ? theRhymes.push(rhyme) : noRhymes.push(rhyme);
							rhyme = line;                                                                 //|-----set this line as the root for a new potential tweet
							wordsToMatch = [lastWord];                                              			//|-----seed grouping of words to check for rhyme with last word
						} else {                                                                        //|---Otherwise...
							wordsToMatch.push(lastWord);                                                  //|-----Add last word to rhyme pool and move on
						}
				} else {                                                                            //|-If existing + this + link will be too long to tweet
					(wordsToMatch.length > 1 && rhymeInArray(wordsToMatch)) ?	theRhymes.push(rhyme) : noRhymes.push(rhyme)
					rhyme = line;																																			//|--set this line as the root for a new potential tweet
					wordsToMatch = [lastWord];																												//|--seed grouping of words to check for rhyme with last word
				}
			}
		}
	}

	//Return array of chunks with rhymes, or all the chunks found if none have known rhymes.
	if (theRhymes.length > 0) {
		return theRhymes;
	} else {
		return noRhymes;
	}
}

// every 30 minutes, make and tweet with alternately rhyming rap lyric and a picture of a cat,
// or a rhyming country lyric with a picture of a dog.
setInterval(makeLyrpicTweet(bot),bot.interval);


//Every 12 hours, dump a list of words that CMUDict couldn't parse to the log and reset the list
setInterval(function() {
	console.log(cmudict.notFound);
	cmudict.notFound = [];
},60000*60*12);