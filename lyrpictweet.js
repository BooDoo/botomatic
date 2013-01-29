/*
	This script takes a random tweet-size lyric (preferably rhyming) from one of the specified songs on ChartLyrics, pairs it 
	with a random image from Flickr, and then tweets the result.

	This was built atop Darius Kazemi's Metaphor-a-Minute. Phonemes for rhyming are taken from the CMU Pronouncing Dictionary, 
	made avaiable as node-cmudict by Nathaniel K Smith. express is used as a placeholder server for fielding HTTP requests. node-restclient is used for making calls to Flickr and YQL.

	Other work by Joel McCoy.

	Currently this is used for Twitter bots @GCatPix and @CWDogPix.
*/

var restclient 	= require('node-restclient'),
		Twit 				= (process.env['NODE_ENV'] == 'production' ? require('twit') : {}),	//Only load Twit module if in production
		express 		= require('express'),
		app 				= express(),
		CMUDict 		= require('cmudict').CMUDict,
		cmudict 		= new CMUDict();

// If you're running locally you don't need this, or express at all.
// This is present for deployment to nodejitsu, which requires some response to http call.
app.get('/', function(req, res){
		res.send('IGNORE ME.');
});
app.listen(3000);

//The cmudict module takes ~2sec on initial query; let's get that out of the way now.
cmudict.get('initialize'); 																// Initial .get() 'preload'

// Delay between generating Tweets (2/hr in production, 30sec locally)
var generateDelay = (process.env['NODE_ENV'] == 'production' ? 60000*30 : 30000);

// Using output account's consumer_* keys and App's generated read/write access_* keys 
// Only loaded/used if in production environment
if (process.env['NODE_ENV'] == 'production') {
	var catT = new Twit({
		consumer_key:					process.env['CAT_TWITTER_CONSUMER_KEY'],
		consumer_secret: 			process.env['CAT_TWITTER_CONSUMER_SECRET'],
		access_token: 				process.env['CAT_TWITTER_ACCESS_TOKEN'],
		access_token_secret: 	process.env['CAT_TWITTER_ACCESS_TOKEN_SECRET']
	});

	var dogT = new Twit({
		consumer_key:					process.env['DOG_TWITTER_CONSUMER_KEY'],
		consumer_secret: 			process.env['DOG_TWITTER_CONSUMER_SECRET'],
		access_token: 				process.env['DOG_TWITTER_ACCESS_TOKEN'],
		access_token_secret: 	process.env['DOG_TWITTER_ACCESS_TOKEN_SECRET']
	});
}

//Get Flickr API key/secret from environment variables
var flickr_key 		= process.env['GCATPIX_FLICKR_KEY'],
		flickr_secret = process.env['GCATPIX_FLICKR_SECRET'];

//Initiate some variables used across the program.
var tweetContent 	=	'',
		shortArtist 	=	'',
		cmuNotFound 	= [],
		catTurn 			= true; //Toggle between rapping cats and country-western dogs

// !!WARNING: ChartLyrics is very sloppy with artist/song look-ups, and tends to only regard the first term fed into it.!! //
var shortRappers = ['DOOM', 'Notorious', 'Quest', 'Black+Star', 'Mos+Def', '2Pac', 'Method', 'Busta', 'Geedorah', 'Madvillain',
										'Ghostface', 'Roots', 'Wu-Tang', 'Blackalicious', 'Ice+Cube', 'Dre', 'De+La+Soul', 'Kanye', 'Nas', 'Homosapien',
										'Mase', 'Lil+Kim', 'Goodie+Mob', 'DANGERDOOM', 'Kweli', 'TI', 'Ludacris', 'Common', 'Eazy'],

		shortCountry = ['Garth+Brooks', 'Toby+Keith', 'Randy+Travis', 'McGraw', 'Chesney', 'Yearwood', 'Kristofferson', 'Emmylou',
									 	'Townes', 'Wynette', 'Waylon', 'Messina', 'Adkins', 'McEntire'],

		shortSongs = {"DOOM": ['Dead', 'Doomsday', 'Finest', 'Drawls', 'Tick', 'Beer', 'Ladies', 'Flow', 'Hey', 'Greenbacks', 'Vomitspit', 'Kookies', 'Frenz'], 
									"Notorious": ['Hypnotize', 'Juicy', 'Poppa', 'Door', 'Chance', 'Going', 'Problems', 'Friend', 'Bleed', 'Nobody', 'Machine', 'Crack', 'Phenomenon', 'Nasty'],
									"Quest": ['Award', 'Kick', 'Scenario', 'Applebum', 'Relaxation', 'Find', 'Wallet', 'Jazz', 'God', 'Steppin', 'Clap', 'Rhime', 'Sex', 'Like', 'Butter', 'Lucien', 'Buggin', 'Common', 'Stories'],
									"Black+Star": ['Astronomy', 'Brown', 'Will', 'Definition', 'Players', 'Respiration', 'Thieves', 'Twice'],
									"Mos+Def": ['Document', 'Bedstuy', 'Ghetto', 'Excellence', 'Habitat', 'Medicine', 'Marvel', 'Sunshine', 'Universe', 'Magnetic'],
									"2Pac": ['Keep', 'California', 'Gospel', 'Picture', 'Hail', 'Nature', 'Holla', 'Love', 'Heartz', 'Amerikaz', 'Shorty', 'Eyez'],
									"Method": ['Break', 'Bring', 'Rockwilder', 'Thang', 'Sandman', 'Spazzola', 'Stimulation', 'Crazy', 'Motto', 'Show', 'Happenin'],
									"Busta": ['Break', 'Eyes', 'Gimme', 'Touch', 'Clap', 'Dreams', 'Fuckin', 'Galore', 'Hardcore', 'Branded', 'Bladow'],
									"Geedorah": ['Snakes', 'Fazers', 'Greenbacks', 'Krazy'],
									"Madvillain": ['Caps', 'Curls', 'Folder', 'Blunted', 'Accordion', 'Strange', 'Lifesaver', 'Rhinestone', 'Figaro', 'Raid', 'Today'],
									"Ghostface": ['Milli', 'Cobra', 'Daytona', 'Motherless', 'Champ', 'Blade', 'Bricks', 'Wildflower'],
									"Roots": ['Dundee', 'Adrenaline', 'Sayin', 'Boom', 'Break', 'Nuthin', 'Double', 'Distortion', 'Dynamite', 'Drawn', 'Ammo', 'Movement', 'Web' ],
									"Wu-Tang": ['Method', 'Protect', 'Shame', 'Redbull', 'Yourz', 'Nuthing', 'Gravel', 'Shadow'],
									"Blackalicious": ['Aerobics', 'Blazing', 'Flight', 'Smithzonian'],
									"Ice+Cube": ['Fairytale', 'AmeriKKKa', 'Better', 'Check', 'Whatever', 'Ghetto', 'Greed', 'Hello', 'Good', 'Jackin', 'Killaz', 'Century', 'Roll', 'Mobbin', 'Wrong'],
									"Dre": ['Witta', 'Niggaz', 'Deeez', 'Day', 'Ride', 'Thang', 'Stll', 'Episode', 'Watcher'],
									"De+La+Soul": ['Soap', 'Breeze', 'Myself', 'Oooh', 'Tunin', 'Potholes', 'Bizness'],
									"Kanye": ['Wire', 'Digger', 'Home', 'Diamonds', 'Touch', 'Falls', 'Words', 'Wonder', 'Gone', 'Major', 'Lollipop'],
									"Nas": ['Affirmative', 'Zombie', 'Childhood', 'Bridging', 'Destroy', 'Knockaboot', 'Drunk', 'Ghetto', 'Halftime', 'Ruled', 'Nigga', 'Look', 'Nastradamus', 'Warfare', 'Smoking', 'Cross', 'Outcome', 'Prediction', 'Around'],
									"Homosapien": ['Ahonetwo', 'Catch', 'Nightmare', 'Bombay', 'Gymnastics', 'Development', 'Proto', 'Town', 'Rewind'],
									"Mase": ['Wanted', 'Breathe', 'Ready', 'Feel', 'Cheat', 'Lookin', 'Yours', 'Hurt','Welcome', 'Die'],
									"Lil+Kim": ['Lighters', 'Crush', 'Tonight', 'Stick', 'Haters', 'Licks', 'Kitty Box', 'Winners', 'Jump', 'Kronik'],
									"Goodie+Mob": ['Therapy', 'Wilderness', 'Away', 'Bag', 'Gutta', 'Soul', 'Standing', 'Experience', 'Party', ],
									"DANGERDOOM": ['Mince', 'School', 'Bada', 'Mask', 'Basket', 'Benzie', 'Crosshairs', 'Nibre', 'Sofa', 'Space'],
									"Kweli": ['Around', 'Cousins', 'Chaos', 'Gordon', 'Get+By', 'Knot', 'Guerrilla', 'Joy', 'Good+to+You', 'Shock', 'Waitin', 'Hill', 'Supreme', 'Proud', 'Work'],
									"TI": ['24', 'ASAP', 'Bring', 'Dopeman', 'Dead', 'Wanna', 'Together', 'Goodlife', 'Hands', 'Straight', 'Limelight', 'King', 'Away', 'Entertainment', 'Type', 'Matter', 'Respect', 'Know', 'Whatever'],
									"Ludacris": ['Fool', 'Area', 'Blow', 'Blueberry', 'Outside', 'America', 'Diamond', 'Back', 'Freaky', 'Game', 'Room', 'Move', 'Number', 'Rollout', 'Saturday', 'Skit', 'Screwed', 'Waterfalls', 'Virgo', 'Fantasy'],
									"Common": ['Night', 'Wasted', 'Aquarius', 'Break', 'Close', 'Break', 'Book', 'Communism', 'Hustler', 'Funky', 'Amphitheater', 'Heaven', 'Want', 'Used', 'Misunderstood', 'Real', 'Resurrection', 'Retrospect', 'Southside', 'Soul', 'Sense', 'Corner', 'Game', 'Light', 'People', 'Questions', 'WMOE'],
									"Eazy": ['Nobody', 'Height', 'Want', 'Talkin', 'Dunn', 'Real', 'More', 'Break', 'Street', 'Break', 'Rather', 'Boyz', 'Radio'],

									"Garth+Brooks": ['Grain', 'Down', 'Clay', 'Association', 'Beer', 'Baton', 'Bridges', 'Shoulder', 'Friends', 'Ride', 'Luck', 'Tomorrow', 'Eyes', 'Cinderella', 'Screamin', 'Learning', 'Blue', 'Too+Young', 'Fly', 'Nobody', 'Counting', 'Papa', 'Rodeo', 'Rollin', 'Story', 'Shameless', 'Somewhere', 'Fire', 'Cheyenne', 'Change', 'Dance', 'Fever', 'Thunder', 'Victim', 'Hatchet', 'Doing', 'Horses', 'Wrapped'],
									"Toby+Keith": ['Action', 'Late', 'Touch', 'Soldier', 'Once', 'Note', 'Truck', 'Moon', 'Drunk', 'Dream', 'Getcha', 'Missing', 'Honkytonk', 'Tonight', 'List', 'Cowboy', 'Mexico', 'Strangers', 'Sweet', 'Fun', 'Kiss'],
									"Randy+Travis": ['1982', 'Angels', 'Deeper', 'Bones', 'Forever', 'Bottom', 'Walked', 'Honky', 'Told', 'Have+You', 'Talk', 'Matter', 'Hands', 'Home', 'Other', 'Reasons', 'Promises', 'Wooden', 'Gone', 'Whisper'],
									"McGraw": ['Angel', 'Back', 'Nothin', 'Fries', 'Take', 'Drugs', 'Everywhere', 'While', 'Grown', 'Like', 'Indian', 'Need', 'Countrier', 'Love', 'Smile', 'Dollar', 'Dying', 'Sleep', 'Friend', 'Thirty', 'Moment', 'Remember', 'Real', 'Refried', 'Heart', 'Rain', 'Something', 'Cowboy', 'Carry', 'Blue', 'Green', 'Turn'],
									"Chesney": ['Different', 'Anything', 'Back', 'Baptism', 'Mexico', 'Star', 'Twice', 'First', 'Forever', 'Back', 'Lost', 'Keg', 'Song', 'Forward', 'Nothing', 'Sexy', 'Summertime', 'Tin', 'Eyes', 'Hello', 'Young'],
									"Yearwood": ['Forever', 'Knees', 'Georgia', 'Live', 'Anyway', 'Another', 'Broken', 'Alright', 'Bus', 'Perfect', 'Boy', 'Some+Days', 'Remembers', 'Woman', 'Thinkin', 'Walkaway', 'American', 'Wild', 'Memphis', 'Will', 'Words', 'Baby'],
									"Kristofferson": ['Dee', 'Breakdown', 'Casey', 'Castle', 'Stones', 'Burden', 'Fiddle', 'Times', 'Night', 'Rainbow', 'Tonight', 'Capricorn', 'Jody', 'Nowhere', 'Easier', 'McGee', 'Nobody', 'Feeling', 'Progress', 'Sunday', 'Possible', 'Protection', 'Taker', 'Devil', 'Blame', 'Why'],
									"Emmylou": ['Date', 'Vie', 'River', 'Amarillo', 'Eyes', 'Beneath', 'Kentucky', 'Born', 'Tupelo', 'Boulder', 'Bright', 'Lament', 'Calling', 'Coat', 'Darkest', 'Easy', 'Evangeline', 'Cowgirls', 'Goodbye', 'Pastures', 'Everywhere', 'Living', 'Someone', 'Win', 'Dreams', 'Jordan', 'Louisiana', 'Hurts', 'Making', 'Songbird', 'Days', 'Orphan', 'Pancho', 'Silver', 'Roses', 'Rocky', 'Sleepless', 'Dreams', 'Boxer', 'Daddy', 'Together', 'Gone', 'Wine', 'Wayfaring', 'Wheels', 'Wrecking', 'Learning'],
									"Townes": ['Quicksilver', 'Song', 'Here', 'Ridge', 'Companion', 'Cocaine', 'Colorado', 'Tomorrow', 'Flowers', 'Dollar', 'Sunshine', 'Take', 'Flyin', 'Sake', 'Fraternity', 'Fraulein', 'Greensboro', 'Between', 'Highway', 'Needed', 'Morning', 'Loretta', 'Lungs', 'Mudd', 'Deal', 'Lonesome', 'Fall', 'Only', 'Mother', 'Rake', 'Rex', 'Cinderella', 'Touched', 'Snake', 'Snow', 'Gambler', 'Tecumseh', 'Fly', 'Tower', 'Girls', 'Who', 'Acting'],
									"Wynette": ['Lonely', 'Apartment', 'Bedtime', 'Crying', 'Way', 'Wanna', 'Singing', 'Stand', 'Darndest', 'Charge', 'Gonna', 'Woman'],
									"Waylon": ['Hearted', 'Abilene', 'Mexico', 'Amanda', 'America', 'Ready', 'Hank', 'Wills', 'Handsome', 'Burning', 'Clyde', 'Outlaw', 'Dreamin', 'Folsom', 'Heroes', 'Living', 'Ramblin', 'Supposed', 'Crazy', 'Satisfy', 'Ladies', 'Lonesome', 'Common', 'Easier', 'Freedom', 'Lucille', 'Luckenbach', 'Mammas', 'Omaha', 'Daddy', 'Rainy', 'Sally', 'Shine', 'Storms', 'Taker', 'Theme', 'Time', 'Had', 'Gypsy', 'Carry', 'Ask'],
									"Messina": ['Because', 'Burn', 'Dare', 'Heads', 'Alright', 'Better', 'Lesson', 'Busted', 'Someone', 'Stand', 'Way', 'Love', 'Angry', 'Free', 'Changes', 'Danny', 'Country', 'Wind', 'Wine', 'Thinking', 'Vahevala', 'River', 'Mama', 'Pooh'],
									"Adkins": ['Thinkin', 'Arlington', 'Chrome', 'Light', 'Badonkadonk', 'Mama', 'Turned', 'Payin', 'Tryin', 'Ladies', 'Lonely', 'Metropolis', 'More', 'Heaven', 'Taillights', 'Rough', 'Songs', 'Swing', 'Then', 'Texas', 'Working', 'Back'],
									"McEntire": ['Still', 'Even', 'Clown', 'Does', 'Fancy', 'Broken', 'Forever', 'Gets', 'Blue', 'Know', 'Rather', 'See', 'Survivor', 'Call', 'Little', 'Find', 'Sister', 'Fool', 'Own', 'Honest', 'Late', 'Rumor', 'John', 'Leave', 'Sunday', 'Back', 'Talking', 'Fear', 'Greatest', 'Hunter', 'Georgia', 'Walk', 'About', 'England', 'Heard', 'Lie', 'Leaving']
								 }; 

//Returns a 'random' element from an array, or just the index to that element.
function randomFromArray(arr, justIndex) {
	if (arr instanceof Array) {
		var index = Math.floor(Math.random() * arr.length);
		if (justIndex === true)   {return index;}
													else{return arr[index];}
	}
	else {return -1;}
};

// Retrieve page somewhere 1-41 from Flickr photos with particular tags and
// CC or more liberal license, sorted by relevance:
function getPicURL(tags, pages) {
	if (typeof pages == 'undefined')
		pages = 41;
	randomPage =  Math.floor((Math.random() * pages) + 1);
	var picURL  =  "http://api.flickr.com/services/rest/?method=flickr.photos.search&" +
										"api_key=" + flickr_key + "&" +
										"tags=" + tags + "&" +
										"license=1%7C2%7C3%7C4%7C5%7C6%7C7%7C8&" +
										"sort=relevance&" +
										"safe_search=1&" +
										"content_type=1&" +
										"page=" + randomPage + "&" +
										"format=json&" +
										"nojsoncallback=1";
	return picURL;
}

function getCatPicURL(pages) {
	if (typeof pages == 'undefined')
		pages = 41;
	return getPicURL('cat%2C+-caterpillar',pages);
}

function getDogPicURL(pages) {
	if (typeof pages == 'undefined')
		pages = 41;
	return getPicURL('dog',pages);
}

//Grab a 'random' artist, and then grab a 'random' song from array of associated titles.
function pickSong() {
	var shortArtist = catTurn ? randomFromArray(shortRappers) : randomFromArray(shortCountry);
	return [shortArtist, randomFromArray(shortSongs[shortArtist])];
}

//Form the request URL for retrieving ChartLyrics API data through YQL.
function makeYQL(artist, song) {
	var lyricURL = 'http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?artist=' + artist + '&song=' + song,
			lyricYQL = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from xml where url="' + lyricURL + '"') + '&format=json';

	return lyricYQL;
}

//Do the damn thang
function makeLyrpicTwit() {
	var tweetContent = '',
			artistAndSong = pickSong(), 																																				//Returns [artist, song]
			yql = makeYQL(artistAndSong[0], artistAndSong[1]); 																									//Returns YQL URL for GET request
	
	console.log(artistAndSong.join('\t'));

	var lyricReq = restclient.get(yql,function(data){
			if(data.query.results.GetLyricResult.Lyric){
				var animPicURL = '',
						fullLyric = data.query.results.GetLyricResult.Lyric.replace(/&amp;quot;/gi,'"').split('\n'); //Array of lyrics, split by newline

				//Call the meat of our logic: crawling through lines to find tweet-sized chunks with rhymes, and then pick a random one.
				var rhymes = findRhymes(fullLyric);
				tweetContent += randomFromArray(rhymes);

				//We'll bail out of this function if no lyric is returned.
				if (typeof tweetContent == 'undefined') { 
					return 0;
				}

				//Then go get the animPicURL (cat or dog, depending on catTurn boolean)
				var animalURL = catTurn ? getCatPicURL() : getDogPicURL();
				var animReq = restclient.get(animalURL,function(animData) {
					//Grab one of the 100 photos on this page at "random"
					var randomPhotoIndex = Math.floor(Math.random() * 100),
							randomPhoto = animData.photos.photo[randomPhotoIndex];
							animPicURL = 'http://flickr.com/' + randomPhoto.owner + '/' + randomPhoto.id + '/';					//compose (non-pretty) URL to Flickr image

					//append the Flickr URL to our tweet and output to log for reference
					tweetContent += ' ' + animPicURL;
					console.log(tweetContent);

					//Only tweet if in production environment
					if (process.env['NODE_ENV'] == 'production') {
						var T = catTurn ? catT : dogT;
						T.post('statuses/update', { status: tweetContent}, function(err, reply) {
							console.log("error: " + err);
							console.log("reply: " + reply);
							console.log('...\n\n');
							});
					}

					//TOGGLE TO OTHER ANIMAL!
					catTurn = !catTurn;

				}, "json");
			} else {
				console.log('DANGER! DANGER! No results for query. (Timeout? Bad request?)');
				try {
						makeLyrpicTwit();
					}
					catch (e) {
						console.log(e);
					}
			}
		}, "json");
}

//Container object for a word to hold its literal content and phonemes from CMUDict
function Word(literal) {
  var that = {};

	that.phonemes = cmudict.get(literal);
	if (typeof that.phonemes == 'undefined') return undefined;

	that.phonemes = that.phonemes.trim().split(' ');
  that.literal = literal;
  that.start = that.phonemes[0];
  that.ending = that.phonemes[that.phonemes.length - 1];

  //Strip leading consonants only for a strict rhyme
	for (var i = 0, ii = that.phonemes.length; i < ii && that.phonemes[i].match(/^[^AEIOU]/i); i++);
	that.rhymeStrict = that.phonemes.slice(i);

	//Phonemes for last vowel sound through end of word for a greedy rhyme
	for (var i = that.phonemes.length - 1; i >= 0 && that.phonemes[i].match(/^[AEIOU]/i); i--);
	that.rhymeGreedy = that.phonemes.slice(--i);

	//If asking for a string of the word, pass its non-phonetic version
  that.toString= function() {
      return that.literal;
  };

  return that;
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
			cmuNotFound.push(lastWord);																														//No pronunciation data in CMUDict; put in a pile
		} else {
			lastWord = asWord;																																		//Otherwise, store Word object for comparison/rhyming
		}
		

		if (line[line.length - 1] != ':' && line[line.length - 1] != ']') {											//Try to omit lines like "CHORUS:" and "[x3]"
			if (wordsToMatch.length === 0) {																											//If first line in a new tweetable cluster:
				rhyme = line;																																				//|-set this line as the root for a new potential tweet
				wordsToMatch = [lastWord];																													//|-seed grouping of words to check for rhyme with last word
			} else {																																							//Otherwise...
				if (rhyme.length + line.length + 3 <= 119) {                                        //|-If existing + this + link will fit in a tweet:
						rhyme += ' / ' + line;																													//|-Add this line to the potential tweet body

						if (l+1 < ll && rhyme.length + fullLyric[l+1].length + 6 > 119) {               //|---If this line will be the last in the group
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
setInterval(function() {
	try {
		makeLyrpicTwit();
	}
	catch (e) {
		console.log(e);
			try {
				makeLyrpicTwit();
			}
			catch (e) {
				console.log(e);
			}
	}
},generateDelay); 																//Set to 30 minute period at top


//Every 12 hours, dump a list of words that CMUDict couldn't parse to the log and reset the list
setInterval(function() {
	console.log(cmuNotFound);
	cmuNotFound = [];
},60000*60*12);