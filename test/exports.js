var Bot           = require('../lib/Bot.js'),
    PromiseConfig = require('../lib/PromiseConfig.js'),
    Promises      = require('../lib/Promises.js'),
    utils         = require('../lib/utils.js'),
    Word          = require('../lib/Word.js'),
    config        = require('../config.js'),
    modules       = {"Bot": Bot, "PromiseConfig": PromiseConfig, "Promises": Promises, "utils": utils, "Word": Word, "config": config},
    _             = require('lodash');


function outputOwnElements(target, prefix, spaced) {
  prefix = prefix || '';
  
  _.forEach(target, function(el, key, obj) {
    console.log(prefix, key);
    if (!_(el).keys().isEmpty()) {
      _(el).keys().forEach(function(name) {
        console.log(prefix+'\t', name);
      });
    }
    if (el.prototype && !_(el.prototype).isEmpty()) {
      console.log(prefix, '\t', '.prototype:');
      outputOwnElements(el.prototype, prefix+'\t\t');
    }
    
    if (spaced) {
      console.log(''); //some whitespace
      }
  });
  
}

outputOwnElements(modules, '', true);