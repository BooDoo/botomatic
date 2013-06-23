var CMUDict     = require('cmudict').CMUDict,
    cmudict     = new CMUDict(),
    querystring = require('querystring'),
    Promises    = require('./Promises.js'),
    _           = require('lodash'),
    utils       = require('./utils.js');

    _.mixin(require('underscore.deferred'));

//The cmudict module takes 2~3sec on initial query; let's get that out of the way now.
cmudict.get('initialize');

//Constructor for an object to hold a word and its phonemes from CMUDict
var Word = function Word (literal, cmu, wordnikKey) {
  if (!(this instanceof Word)) {
    return new Word(literal);
  }
  //this.cmudict = utils.setArgDefault(cmu, cmudict);

  //if it's already cached, return it!
  if (Word.words[literal]) {return Word.words[literal];}

  var i, ii;

  this.literal = literal;
  this.phonemes = cmudict.get(literal);
  this.pos = null;
  this.descriptors = null;

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

  if (wordnikKey) { //Grab partOfSpeech array off the bat
    this.partOfSpeech(wordnikKey);
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

Word.prototype.partOfSpeech = function(wordnikKey, targetPos) {
  return Word.partOfSpeech(this, wordnikKey, targetPos);
}

Word.prototype.descriptiveWords = function(wordnikKey, targetPos) {
  return Word.descriptiveWords(this, wordnikKey, targetPos);
}

//Pass targetPos to check against; otherwise return list of all found
Word.partOfSpeech = function(word, wordnikKey, targetPos) {
  if (!(word instanceof Word)) word = new Word(word);
  if (!wordnikKey) {console.log("ERR: Wordnik Key needed to check part of speech"); return false;}
  console.log("Entering partOfSpeech(",word.literal,")...");
  var literal = word.literal,
      reqParams = {"api_key": wordnikKey},
      splitRE = /\s*[,;]\s*/,
      posFound,
      wordnikEndpoint,
      apiPromise,
      posDeferred = _.Deferred(),
      posPromise = posDeferred.promise();

  //Take a string or array of target parts of speech
  if (targetPos && !_.isArray(targetPos)) {
    targetPos = targetPos.split(splitRE);
  }

  if (word.pos === null) { //We haven't searched this one yet, do so.
    wordnikEndpoint = "http://api.wordnik.com/v4/word.json/" + literal
                    + "/definitions?"+querystring.stringify(reqParams);

    apiPromise = Promises.makePartOfSpeechPromise(wordnikEndpoint);
  }
  else {
    apiPromise = [word.pos] //Hacky as HEEECCCKKKK
  }

  _.when(apiPromise)
    .done(function(pos) {
      word.pos = pos;
        if (targetPos && _.isEmpty(_.intersection(targetPos, word.pos))) {
          //console.log(literal, ",", targetPos, "not found in:", word.pos);
          posDeferred.reject(false);
        }
      posDeferred.resolve(word.pos);
    });

  return posPromise;
}

Word.descriptiveWords = function descriptiveWords(word, wordnikKey, targetPos) {
  if (!(word instanceof Word)) word = new Word(word);
  if (!wordnikKey) {console.log("ERR: Wordnik Key needed to get descriptors"); return false;}
  targetPos = targetPos || ["adjective", "adverb"];
  console.log("Entering descriptiveWords(",word.literal,")...");
  var literal         = word.literal,
      splitRE         = /\s*[,;]\s*/,
      reqParams       = {"limit":50, "wlmi":8, "api_key":wordnikKey},
      wordnikEndpoint,
      apiPromise,
      descDeferred    = _.Deferred(),
      descPromise     = descDeferred.promise();

  if (targetPos && !_.isArray(targetPos)) {
    targetPos = targetPos.split(splitRE);
  }

  if (word.descriptors === null) { //We haven't searched this one yet
    wordnikEndpoint = "http://api.wordnik.com/v4/word.json/" + literal
                    + "/phrases?" + querystring.stringify(reqParams);

    apiPromise = Promises.makeDescriptorsPromise(wordnikEndpoint);
  }
  else {
    apiPromise = word.descriptors //Need to [] wrap if piping
  }

  apiPromise.done(function(descs) {
    //console.log("Assigning descriptors to",literal,"object");
    word.descriptors = descs;
  });
  apiPromise.fail(function() {
    console.log("No good descriptors for",literal);
    word.descriptors = [];
  });
  //TODO: Alright, we have an array of descriptors. Now what?
  //Add pos behavior for words if filterPos is true?
  return apiPromise;
};

Word.randomWords = function randomWords(wordnikKey, options) {
      if (!wordnikKey) {console.log("ERR: Wordnik Key needed to get random words"); return false;}
      options = options || {};
      options.api_key = wordnikKey;
      var url = "http://api.wordnik.com//v4/words.json/randomWords?"
                + querystring.stringify(options);

      delete options.api_key; //Don't want this hanging around!
      return Promises.makeRandomWordsPromise(url);
}

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

//Word.prototype.isRhymeInArray = Word.isRhymeInArray;
//Word.prototype.findRhymes = Word.findRhymes;

Word.words = {};    //Holder for caching Word objects

module.exports = Word;
