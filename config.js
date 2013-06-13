//Three objects:
//dashboard - settings for the express server/web dashboard
//credentials - API keys/secrets
//bots - configuration for each lyric/picture pairing robot

var dashboard = {
    admins : {
      "botALLY":
      {
        username:           "botALLY",
        password:           process.env['UPDATE_PASS']
      }
    },

    protectView:            process.env['PROTECT_VIEW']   || false,
    protectUpdate:          process.env['PROTECT_UPDATE'] || true,
    protectStore:           process.env['PROTECT_STORE']  || true
}

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

    twitter_lyrpic:
    {
      service:              "twitter",
      consumer_key:         process.env['LYRPIC_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['LYRPIC_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['LYRPIC_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['LYRPIC_TWITTER_ACCESS_TOKEN_SECRET']
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
      format:               "<%= lyricSegment %> <%= photoURL %>",
      twitter:              credentials.twitter_gcatpix,
      flickr:               credentials.flickr_boodoo,
      tags:                 "cat%2C+-caterpillar",
      lyricType:            "rap",
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*60 : 30000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },

    countrydogs:
    {
      type:                 "lyrpictweet",
      handle:               "countrydogs",
      format:               "<%= lyricSegment %> <%= photoURL %>",
      twitter:              credentials.twitter_cwdogpix,
      flickr:               credentials.flickr_boodoo,
      tags:                 "dog",
      lyricType:            "country",
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*60 : 30000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },
/*
    lyrpic:
    {
      type:                 "lyrpictweet",
      handle:               "lyrpic",
      format:               "<%= lyricSegment %> <%= photoURL %>",
      twitter:              credentials.twitter_lyrpic,
      flickr:               credentials.flickr_boodoo,
      tags:                 "",
      lyricType:            "all",
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*60 : 30000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },
*/
    camptownraces:
    {
      type:                 "syllablecount",
      handle:               "camptownraces",
      format:               "<%= prefix %><%= target %><%= suffix>",
      twitter:              credentials.twitter_ct_races,
      targetSyllables:      7,
      //prefix:             '',
      suffix:               ' / doo-dah, doo-dah…',
      //queueMax:             300,
      searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*10 : 30000,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*15 : 60000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },

    xyisx:
    {
      type:                 "snowclone",
      handle:               "xyisx",
      format:               "<%= word1 %> <%= word2 %> is <%= word1 %>",
      twitter:              credentials.twitter_xyisx,
      wordnik:              credentials.wordnik_boodoo,
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
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*15   : 30000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },

    latourandorder:
    {
      type:                 "latourandorder",
      handle:               "latourandorder",
      format:               "<%= pre %> <%= post %>",
      twitter:              credentials.twitter_xyisx,
      criteria:             [], //unused at present
      pivot:                '', //also unused
      prioritySource:       1,
      preSource:            1,
      searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*60*2 : 60000*4,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*60 : 60000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },

    latourswag:
    {
      type:                 "tweetmash",
      handle:               "latourswag",
      format:               "<%= pre %><%= pivot %><%= post %>",
      twitter:              credentials.twitter_xyisx,
      criteria:             ["#swag and", "from:latourbot"],
      pivot:                " and ",
      searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*30 : 60000,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*15 : 60000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },

    commentsreminder: {
      type:                 "reminder",
      handle:               "commentsreminder",
      format:               "<%= content %>",
      twitter:              credentials.twitter_xyisx,
      contentPool:          ['Message 1', 'Message 2', 'Message 3', 'Message 4', 'Message 5', 'Message 6', 'Message 7', 'Message 8'],
      isRandom:             true,
      //prefix:             '',
      //suffix:             '',
      interval:             process.env.NODE_ENV === 'production' ? 60000*60*24 : 30000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },

    mlg420:
    {
      type:                 "youtube",
      handle:               "mlg420",
      format:               "<%= vidTitle %> <%= vidURL %>",
      twitter:              credentials.twitter_xyisx,
      criteria:             'mlg+420',
      //contentPool:        ,
      //isRandom:           true,
      searchInterval:       process.env.NODE_ENV === 'production' ? 60000*60*4 : 30000,
      interval:             process.env.NODE_ENV === 'production' ? 60000*60*8 : 60000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    }
  };

module.exports.dashboard = dashboard;
module.exports.credentials = credentials;
module.exports.bots = bots;
