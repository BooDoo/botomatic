var _           = require('lodash'),
    restclient  = require('node-restclient'),
    request     = require('request'),
    bot = {};
    _.mixin(require('underscore.deferred'));

function populateRandomWords() {
  //bot = setArgDefault(bot, this, Bot);
  
  var w, 
      words = {
        word1:          'includePartOfSpeech=adjective' +
                        '&excludePartOfSpeech=verb-intransitive' +
                        '&hasDictionaryDef=true' +
                        '&limit=10' +
                        '&minCorpusCount=500',
                        
        word2:          'includePartOfSpeech=noun' + 
                        '&excludePartOfSpeech=noun-plural,pronoun,noun-posessive,proper-noun-posessive,suffix,idiom,affix' +
                        '&hasDictionaryDef=true' +
                        '&limit=10' +
                        '&minCorpusCount=500'
      },
      randoProms = {};
      //wordnikURLs = getWordnikURLs(),
      //wordnikURL = '';
  
  for (w in words) {
    bot['whatev'] = 'oof';
    bot[w + 's'] = getRandomWordsPromise(w)
    .done(function(res, wordName) {
      bot[wordName + 's'] = res;
      console.log('res; ', wordName, 's');
    });
    console.log('Pushed promise for ', w + 's');
  }
  
  console.log(JSON.stringify(bot));
  setTimeout(function() {console.log(JSON.stringify(bot));}, 3000);
  
}

function getRandomWordsPromise(wordName) {
  var rwDeferred = _.Deferred(),
      randomWordPromise = rwDeferred.promise(),
      url = getWordnikURLs()[wordName];
      //console.log('Request for:', url);
  request({
    url: url
  }, function (error, response, body) {
    if (!error) {
      //console.log(JSON.parse(body).word);
      //console.log(I.singularize(JSON.parse(body).word));
      console.log('Resolving: ', body);
      rwDeferred.resolve(JSON.parse(body), wordName);
    }
    else {
      console.log("Rejecting!: ", error);
      rwDeferred.reject(error);
    }
  });
  
  return randomWordPromise;
}

function getWordnikURLs() {
  //bot = setArgDefault(bot, this, Bot);
  var w,
      words = {
        word1:          'includePartOfSpeech=adjective' +
                        '&excludePartOfSpeech=verb-intransitive' +
                        '&hasDictionaryDef=true' +
                        '&limit=10' +
                        '&minCorpusCount=5000',
                        
        word2:          'includePartOfSpeech=noun' + 
                        '&excludePartOfSpeech=noun-plural,pronoun,noun-posessive,proper-noun-posessive,suffix,idiom,affix' +
                        '&hasDictionaryDef=true' +
                        '&limit=10' +
                        '&minCorpusCount=5000'
      },
      api_key = 'cefde350e39c91a83e20b0a2f470b48fcbde9b4f5e6b30565',
      toReturn = {};
      
  for (w in words) {
    toReturn[w] = "http://api.wordnik.com//v4/words.json/randomWords?" + words[w] + "&api_key=" + api_key;
    //console.log(w, 'url: ', toReturn[w]);
  }
  
  return toReturn;
}

populateRandomWords();