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

  bots = {
    rapcats:
    {
      type:                 "lyrpictweet",
      handle:               "rapcats",
      twitter:              credentials.twitter_gcatpix,
      flickr:               credentials.flickr_boodoo,
      tags:                 "cat%2C+-caterpillar",
      lyricGenre:           "rap",
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*60 : 30000
    },
    
    countrydogs:
    {
      type:                 "lyrpictweet",
      handle:               "countrydogs",
      twitter:              credentials.twitter_cwdogpix,
      flickr:               credentials.flickr_boodoo,
      tags:                 "dog",
      lyricGenre:           "all",
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
      twitter:              credentials.twitter_xyisx,
      criteria:             ["#swag and", "from:latourbot"],
      pivot:                " and ",
      //searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*10 : 30000,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*15 : 60000
    },
    
    commentsreminder: {
      type:                 "reminder",
      handle:               "commentsreminder",
      twitter:              credentials.twitter_xyisx,
      contentPool:          ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5', 'Message 6', 'Message 7', 'Message 8'],
      isRandom:             true,
      //prefix:             '',
      //suffix:             '',
      interval:             process.env.NODE_ENV === 'production' ? 60000*60*24 : 30000
    },
    
    mlg420:
    {
      type:                 "youtube",
      handle:               "mlg420",
      twitter:              credentials.twitter_xyisx,
      criteria:             'mlg+420',
      //contentPool:        ,
      //isRandom:           true,
      searchInterval:       process.env.NODE_ENV === 'production' ? 60000*60*4 : 30000,
      interval:             process.env.NODE_ENV === 'production' ? 60000*60*8 : 60000
    },
    
    xyisx:
    {
      type:                 "snowclone",
      handle:               "xyisx",
      twitter:              credentials.twitter_xyisx,
      wordnik:              credentials.wordnik_boodoo,
      format:               "<%= word1 %> <%= word2 %> is <%= word1 %>",
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
      searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*60*2 : 60000*4,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*15   : 30000
    }
  };

module.exports.credentials = credentials;
module.exports.bots = bots;