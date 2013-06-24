var CMUDict     = require('cmudict').CMUDict,
    cmudict     = new CMUDict(),
    _           = require('lodash'),
    qs          = require('querystring'),
    when        = require('when'),
    Promises    = require('./Promises.js'),
    utils       = require('./utils.js');

(function init() {
  //The cmudict module takes ~2sec on initifal query; let's get that out of the way now.
  cmudict.get('initialize');
})();

//Constructor for an object to hold a word and its phonemes from CMUDict
var Word = function Word (literal, cmu) {
  try {
    literal = literal.toLowerCase();
  }
  catch(e) {
    console.error("No literal value given for new word!");
    return null;
  }

  if (Word.words[literal]) {return Word.words[literal];}

  if (!(this instanceof Word)) {
    return new Word(literal);
  }
  //this.cmudict = utils.setArgDefault(cmu, cmudict);

  var i, ii;

  this.literal = literal;
  this.phonemes = cmudict.get(literal);
  /*
  this._partOfSpeech = null;
  this._isDescriptor = null;
  this._descriptors = null;
  */

  if (typeof this.phonemes === 'undefined') {
    this.phonemes = null; //Not found in CMUDict!
    //cmuNotFound.push(literal); //Add to list of unknown words
  }
  else {
    this.phonemes = this.phonemes.trim().split(' ');

    //Strip leading consonants only for a strict rhyme
    for (i = 0, ii = this.phonemes.length; i < ii && this.phonemes[i].match(/^[^AEIOU]/i); i++);
    this.rhymeStrict = this.phonemes.slice(i);

    //Phonemes for last vowel sound through end of word for a greedy rhyme
    for (i = this.phonemes.length - 1; i > 0 && this.phonemes[i].match(/^[AEIOU]/i); i--);
    this.rhymeGreedy = this.phonemes.slice(--i);
  }

  Word.words[this.literal] = this;
}

Word.prototype.toString = function() {
  return this.literal;
};

//Count syllables basde on phonemes (ARPABET format from CMUDict) in Word object
//Sets .syllableCount on Word and also returns the count (or null)
Word.prototype.countSyllables = function(word) {
  word = utils.setArgDefault(word, this, Word);
  var p, pp,
      first;

  if (word.phonemes === null) {
    //Add a fallback to Wordnik API here?
    word.syllableCount = null;
  }
  else {
    for (p = 0, pp = word.phonemes.length, word.syllableCount = 0; p < pp; p++) {
      first = word.phonemes[p].charAt(0);
      if  (first == 'A' ||
           first == 'E' ||
           first == 'I' ||
           first == 'O' ||
           first == 'U') {
        word.syllableCount++;
      }
    }
  }

  return word.syllableCount;
};

//Working now? Want to be more flexible, though.
Word.isRhymeInArray = function isRhymeInArray(words) {
  var w = 0, ww = words.length,
      word = null,
      toCompare = '',
      rhymeFound = false;

  for (; w < ww; w += 1) {
    word = words[w];

    if (word instanceof String) {
      word = new Word(word);
    }

    if (word.phonemes) {
      //console.log('words[' + w + ']: ' + words[w]);
      toCompare = word.rhymeGreedy.join(' ').replace(/\d/g,'');                                 //Strip numbers for looser vowel matching

      rhymeFound = words.some(function(el, ind, arr) {
        if (typeof el.rhymeGreedy === 'undefined' || el.literal === word.literal) {
          return false;
        }
        else {
          return (toCompare === el.rhymeGreedy.join(' ').replace(/\d/g,''));
        }
      });

      if (rhymeFound) return true;
    }
  }

  //After going through the array of words, no rhyming pair was found.
  return false;
};

Word.findRhymes = function findRhymes(fullLyric) {
  var l = 0, ll = fullLyric.length,
      line          = '',
      lastWord      = '',
      theRhymes     = [],
      nonRhymes     = [],
      wordsToRhyme  = [],
      tweetLyric    = '',
      isRhymeInArray= this.isRhymeInArray || Word.isRhymeInArray,
      //cleanupRE     = /[\[\}].+?[\]\}]|[\[\(\{]?(x\d+|\d+x)[\)\]\}]?|&.+?;|^\(|\)$/gi;
      cleanupRE     = /[\[\}].+?[\]\}]|[\[\(\{]*(?:[x\*]\d+|\d+[x\*])[\)\]\}]*|&.+?;|^[\(\[\{].+?[\)\]\}]|[\(\[\{].+?[\)\]\}]$|\<.+?\>/gi;

  for (; l<ll; l++) {
    line = fullLyric[l].replace(cleanupRE,'').trim();

    if (line.length > 1 && line[line.length - 1] != ':' && line[line.length - 1] != ']') {  //Try to omit lines like "CHORUS:" and "[x3]"

      //Get last word in line as Word object
      lastWord = line.match(/[\S]+$/)[0].replace(/\W/g,'').toUpperCase();
      lastWord = Word.words[lastWord] || new Word(lastWord);

      if (wordsToRhyme.length === 0) {                                                      //If first line in a new tweetable cluster:
        tweetLyric = line;                                                                       //|-set this line as the root for a new potential tweet
        wordsToRhyme = [lastWord];                                                          //|-seed grouping of words to check for rhyme with last word
      }
      else {                                                                              //Otherwise...
        if (tweetLyric.length + line.length + 3 <= 117) {                                        //|-If existing + this + link will fit in a tweet:
            tweetLyric += ' / ' + line;                                                          //|-Add this line to the potential tweet body

            if (l+1 < ll && tweetLyric.length + fullLyric[l+1].length + 3 > 117) {
              wordsToRhyme.push(lastWord);
              (wordsToRhyme.length > 1 && isRhymeInArray(wordsToRhyme)) ? theRhymes.push(tweetLyric) : nonRhymes.push(tweetLyric);
              tweetLyric = line;
              wordsToRhyme = [lastWord];
            }
            else {
              wordsToRhyme.push(lastWord);
            }
        }
        else {                                                                            //|-If existing + this + link will be too long to tweet
          (wordsToRhyme.length > 1 && isRhymeInArray(wordsToRhyme)) ? theRhymes.push(tweetLyric) : nonRhymes.push(tweetLyric);
          tweetLyric = line;
          wordsToRhyme = [lastWord];
        }
      }
    }
  }

  //Return array of chunks with rhymes, or all the chunks found if none have known rhymes.
  if (theRhymes.length > 0) {
    return theRhymes;
  }
  else {
    return nonRhymes;
  }
};

Word.makeWordnik = function(wordnikKey) {
  Word.wordnikKey = wordnikKey;
}

Word.prototype.phrasePres = function(params, wordnikKey) {
  return Word.phrasePres(this, params, wordnikKey);
}

Word.prototype.partOfSpeech = function(params, wordnikKey) {
  return Word.partOfSpeech(this, params, wordnikKey);
};

Word.prototype.isDescriptor = function(wordnikKey) {
  return Word.isDescriptor(this, wordnikKey);
}

Word.prototype.descriptors = function(params, wordnikKey) {
  return Word.descriptors(this, params, wordnikKey);
}

Word.phrasePres = function(word, params, wordnikKey) {
  if (!(word instanceof Word)) {word = new Word(word);} //as Word()
  if (word._phrasePres) {return word._phrasePres;}      //already cached

  wordnikKey = wordnikKey || Word.wordnikKey;
  params = params || {"limit": 30, "wlmi": 8};
  params.api_key = params.api_key || wordnikKey;
  if (!params.api_key) {return when.reject("Wordnik API key required");}

  var wnEndpoint = "http://api.wordnik.com/v4/word.json/" + word.literal + "/phrases?" + qs.stringify(params),
      wnPromise = Promises.makePhrasePresPromise(wnEndpoint);

  wnPromise.then(
    function(phrasePres) {word._phrasePres = phrasePres;},
    function(e) {console.error("Phrasal prefixes for",word.literal,"not retrieved.");}
  );

  return wnPromise;
}

Word.partOfSpeech = function(word, params, wordnikKey) {
  if (!(word instanceof Word)) {word = new Word(word);} //as Word()
  if (word._partOfSpeech) {return when.resolve(word._partOfSpeech);}  //already cached

  wordnikKey = wordnikKey || Word.wordnikKey;
  params = params || {};
  params.api_key = params.api_key || wordnikKey;
  if (!params.api_key) {return when.reject("Wordnik API key required");}

  var wnEndpoint = "http://api.wordnik.com/v4/word.json/" + word.literal + "/definitions?" + qs.stringify(params),
      wnPromise = Promises.makePartOfSpeechPromise(wnEndpoint);

  wnPromise.then(
    function(partOfSpeech) {word._partOfSpeech = partOfSpeech;},
    function(e) {console.error("Phrasal prefixes for",word.literal,"not retrieved.");}
  );

  return wnPromise;
}

Word.isDescriptor = function(word, wordnikKey) {
  if (!(word instanceof Word)) {word = new Word(word);} //as Word()
  if (word._isDescriptor) {return when.resolve(word._isDescriptor);}

  wordnikKey = wordnikKey || Word.wordnikKey;
  if (!wordnikKey) {return when.reject("Wordnik API key required");}

  var params = {"api_key": wordnikKey},
      descRE = /adjective|adverb/i,
      descDeferred = when.defer();

  when(word.partOfSpeech())
  .then(
    function(pos) {word._isDescriptor = (pos.search(descRE) > -1); descDeferred.resolve(word._isDescriptor);},
    function(e) {descDeferred.reject("Failed part of speech lookup for",word.literal);}
  )

  return descDeferred.promise;
}

//Return a randomWords promise
//This could be generalized for other Wordnik behavior!
Word.randomWords = function(params, wordnikKey) {
  wordnikKey = wordnikKey || Word.wordnikKey;
  params = params || {};
  params.api_key = params.api_key || wordnikKey;
  if (!params.api_key) {return when.reject("Wordnik API key required");}

  var wnEndpoint = "http://api.wordnik.com/v4/words.json/randomWords?" + qs.stringify(params);
  //console.log("randomWords endpoint:",wnEndpoint);
  return Promises.makeRandomWordsPromise(wnEndpoint);
};

Word.descriptors = function(word, params, wordnikKey) {
  if (!(word instanceof Word)) {word = new Word(word);} //as Word()
  if (word._descriptors) {console.log("descriptors are cached:",word._descriptors); return when.resolve(word._descriptors);}    //already cached
  wordnikKey = wordnikKey || Word.wordnikKey;
  params = params || {};
  params.api_key = params.api_key || wordnikKey;
  if (!params.api_key) {return when.reject("Wordnik API key required");}

  //console.log("Getting descriptors for:",word.literal);
  //Make an array of promises checking if each pre is a descriptor
  var descDeferred = when.defer();
      prePromises = when.map(word.phrasePres(), function(pre) {
    return Word.isDescriptor(pre, wordnikKey);
  });

  when.settle(prePromises).then(function(returns) {
    var descs = [];
    _.each(returns, function(v, i) {
      if (v.state === 'fulfilled' & v.value === true) {
        descs.push(word._phrasePres[i]);
      }
    });
    word._descriptors = descs;
    descDeferred.resolve(descs);
  });

  return descDeferred.promise;
}

//Word.prototype.isRhymeInArray = Word.isRhymeInArray;
//Word.prototype.findRhymes = Word.findRhymes;

Word.words = {};    //Holder for caching Word objects

module.exports = Word;
