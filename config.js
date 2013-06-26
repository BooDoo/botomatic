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

    twitter_latour:
    {
      service:              "twitter",
      consumer_key:         process.env['LATOUR_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['LATOUR_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['LATOUR_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['LATOUR_TWITTER_ACCESS_TOKEN_SECRET']
    },

    twitter_porpenteen:
    {
      service:              "twitter",
      consumer_key:         process.env['PORP_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['PORP_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['PORP_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['PORP_TWITTER_ACCESS_TOKEN_SECRET']
    },

    twitter_likeilike:
    {
      service:              "twitter",
      consumer_key:         process.env['LIKE_TWITTER_CONSUMER_KEY'],
      consumer_secret:      process.env['LIKE_TWITTER_CONSUMER_SECRET'],
      access_token:         process.env['LIKE_TWITTER_ACCESS_TOKEN'],
      access_token_secret:  process.env['LIKE_TWITTER_ACCESS_TOKEN_SECRET']
    },

    flickr:
    {
      service:              "flickr",
      flickr_key:           process.env['BOODOO_FLICKR_KEY'],
      flickr_secret:        process.env['BOODOO_FLICKR_SECRET']
    },

    wordnik:
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
      flickr:               credentials.flickr,
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
      flickr:               credentials.flickr,
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
      flickr:               credentials.flickr,
      tags:                 "",
      lyricType:            "lyricryptic",
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
      wordnik:              credentials.wordnik,
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
      twitter:              credentials.twitter_latour,
      prioritySource:       1,
      preSource:            1,
      searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*60*2 : 60000*4,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*60 : 60000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },

    porpenteen:
    {
      type:                 "tweetmash",
      handle:               "porpenteen",
      format:               "<%= pre %><%= pivot %><%= post %>",
      twitter:              credentials.twitter_porpenteen,
      criteria:             ["#swag and", "from:aliendovecote and"],
      pivot:                " and ",
      searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*30 : 60000,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*15 : 60000,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    },

    likeilike:
    {
      type:                 "howilikeit",
      handle:               "likeilike",
      format:               "I like my <%= person %> like I like my <%= object %>: <%= desc0 %>, <%= desc1 %>, <%= junc %> <%= desc2 %>.",
      twitter:              credentials.twitter_likeilike,
      wordnik:              credentials.wordnik,
      words:
      {
                    object:
                          {
                            includePartOfSpeech: "noun",
                            excludePartOfSpeech: "pronoun,noun-posessive,proper-noun-posessive,suffix,idiom,affix",
                            hasDictionaryDef: false,
                            limit: 10,
                            minDictionaryCount: 10,
                            minCorpusCount: 5000
                          }
      },
      persons:              ["men", "women", "ladies", "fellahs", "partners", "hook-ups", "pairings", "lovers", "husbands", "wives", "spouses"],
      juncs:                ["and", "but", "not"],
      searchInterval:       process.env['NODE_ENV'] === 'production' ? 60000*30 : 60000/2,
      interval:             process.env['NODE_ENV'] === 'production' ? 60000*45 : 60000*3,
      hideDash:             ["twitter", "T", "flickr", "wordnik", "hideDash", "intervalId", "searchIntervalId"]
    }
  };

module.exports.dashboard = dashboard;
module.exports.credentials = credentials;
module.exports.bots = bots;
