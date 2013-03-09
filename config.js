 //Three objects:
//bots - configuration for each lyric/picture pairing robot
//songSets - hash of {artist: [title1, title2], ...} to generate artist/title pair for song look-up
//credentials - API keys/secrets

var credentials = {
    twitter_gcatpix : 
    {
      service:              "twitter",
      consumer_key:         process.env['CAT_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['CAT_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['CAT_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['CAT_TWITTER_ACCESS_TOKEN_SECRET']
    },
   
    twitter_cwdogpix:
    {
      service:              "twitter",
      consumer_key:         process.env['DOG_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['DOG_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['DOG_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['DOG_TWITTER_ACCESS_TOKEN_SECRET']
    },

    twitter_ct_races:
    {
      service:              "twitter",
      consumer_key:         process.env['CTR_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['CTR_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['CTR_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['CTR_TWITTER_ACCESS_TOKEN_SECRET']
    },

    twitter_latour:
    {
      service:              "twitter",
      consumer_key:         process.env['DOG_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['DOG_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['DOG_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['DOG_TWITTER_ACCESS_TOKEN_SECRET']
    },

    twitter_avoidComments:
    {
      service:              "twitter",
      consumer_key:         process.env['DOG_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['DOG_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['DOG_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['DOG_TWITTER_ACCESS_TOKEN_SECRET']
    },
    
    twitter_mlg420:
    {
      service:              "twitter",
      consumer_key:         process.env['DOG_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['DOG_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['DOG_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['DOG_TWITTER_ACCESS_TOKEN_SECRET']      
    },

    twitter_xyisx:
    {
      service:              "twitter",
      consumer_key:         process.env['XYX_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['XYX_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['XYX_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['XYX_TWITTER_ACCESS_TOKEN_SECRET']      
    },

    flickr_boodoo:
    {
      service:              "flickr",
      flickr_key:           process.env['BOODOO_FLICKR_KEY'],
      flickr_secret:        process.env['BOODOO_FLICKR_SECRET']
    },
    
    wordnik_boodoo:
    {
      service:              "wordnik",
      api_key:              process.env['BOODOO_WORDNIK_KEY']
    }
  },

  songSets = {
    rap:
    { 
      "DOOM": ['Dead', 'Doomsday', 'Finest', 'Drawls', 'Tick', 'Beer', 'Ladies', 'Flow', 'Hey', 'Greenbacks', 'Vomitspit', 'Kookies', 'Frenz'], 
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
      "Eazy": ['Nobody', 'Height', 'Want', 'Talkin', 'Dunn', 'Real', 'More', 'Break', 'Street', 'Break', 'Rather', 'Boyz', 'Radio']
    },

    country:
    {
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
    }
  },

  contentPools = {
    avoidComments:          ["You'll regret this", "Don't read them!", "Remember your promise.", "You think you want to, but you don't."]
  },

  bots = {
    rapcats:
    {
      type:                 "lyrpictweet",
      handle:               "rapcats",
      twitter:              credentials.twitter_gcatpix,
      flickr:               credentials.flickr_boodoo,
      tags:                 "cat%2C+-caterpillar",
      songs:                songSets.rap,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*60 : 30000
    },
    
    countrydogs:
    {
      type:                 "lyrpictweet",
      handle:               "countrydogs",
      twitter:              credentials.twitter_cwdogpix,
      flickr:               credentials.flickr_boodoo,
      tags:                 "dog",
      songs:                songSets.country,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*60 : 30000
    },
    
    camptownraces:
    {
      type:                 "syllablecount",
      handle:               "camptownraces",
      twitter:              credentials.twitter_ct_races,
      targetSyllables:      7,
      //prefix:             '',
      suffix:               ' / doo-dah, doo-dah…',
      //queueMax:             300,
      searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*10 : 30000,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*15 : 60000
    },
    
    latourswag:
    {
      type:                 "tweetmash",
      handle:               "latourswag",
      twitter:              credentials.twitter_latour,
      criteria:             ["#swag and", "from:latourbot"],
      pivot:                " and ",
      //searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*10 : 30000,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*15 : 60000
    },
    
    commentsreminder: {
      type:             "reminder",
      handle:           "commentsreminder",
      twitter:          credentials.twitter_avoidComments,
      contentPool:      contentPools.avoidComments,
      isRandom:         true,
      //prefix:           '',
      //suffix:           '',
      interval:         process.env.NODE_ENV === 'production' ? 60000*60*24 : 30000
    },
    
    mlg420:
    {
      type:             "youtube",
      handle:           "mlg420",
      twitter:          credentials.twitter_mlg420,
      criteria:         'mlg+420',
      //contentPool:      ,
      //isRandom:         true,
      searchInterval:   process.env.NODE_ENV === 'production' ? 60000*60*4 : 30000,
      interval:         process.env.NODE_ENV === 'production' ? 60000*60*8 : 60000
    },
    
    xyisx:
    {
      type:             "snowclone",
      handle:           "xyisx",
      twitter:          credentials.twitter_xyisx,
      wordnik:          credentials.wordnik_boodoo,
      format:           "<%= word1 %> <%= word2 %> is <%= word1 %>",
      words:            
      {
        word1:
        {
                        includePartOfSpeech: "adjective",
                        excludePartOfSpeech: "verb-intransitive",
                        hasDictionaryDef: "true",
                        limit: 10,
                        minDictionaryCount: 10,
                        minCorpusCount: 5000
        },
        word2:
        {
                        includePartOfSpeech: "noun",
                        excludePartOfSpeech: "noun-plural,pronoun,noun-posessive,proper-noun-posessive,suffix,idiom,affix",
                        hasDictionaryDef: false,
                        limit: 10,
                        minDictionaryCount: 10, 
                        minCorpusCount: 5000
        }
      },
      searchInterval:   process.env['NODE_ENV'] === 'production' ? 60000*60*2 : 60000*4,
      interval:         process.env['NODE_ENV'] === 'production' ? 60000*15   : 30000
    }
  };

module.exports.credentials = credentials;
module.exports.songSets = songSets;
module.exports.contentPools = contentPools;
module.exports.bots = bots;