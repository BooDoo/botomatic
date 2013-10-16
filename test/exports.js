var Bot           = require(__dirname + '/../lib/Bot.js'),
    PromiseConfig = require(__dirname + '/../lib/PromiseConfig.js'),
    Promises      = require(__dirname + '/../lib/Promises.js'),
    utils         = require(__dirname + '/../lib/utils.js'),
    Word          = require(__dirname + '/../lib/Word.js'),
    config        = require(__dirname + '/../config.js'),
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
