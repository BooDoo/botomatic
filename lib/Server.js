var CONFIG      = require('../config.js'),
    utils       = require('./utils.js'),
    Bot         = require('./Bot.js'),
    _           = require('lodash'),
    fs          = require('fs'),
    botStates   = fs.existsSync('../bots.json') ? JSON.parse(fs.readFileSync('../bots.json', 'utf8')) : false;

function botsWithState(handles, activeHandles) {
  handles       = handles || _.keys(CONFIG.bots);
  activeHandles = activeHandles || _.keys(Bot.bots);
  var bots = _(handles)
                .map(function(v, i, a) {
                  return {
                    label: v,
                    state: _.contains(activeHandles, v)
                  };
                })
                .sortBy(function (v,k,o) {
                  return !v.state;
                })
                .valueOf();
  return bots;
}

function propertiesWithState(handle) {
  var bot       = Bot.bots[handle] || CONFIG.bots[handle],
      hideDash  = bot.hideDash,
      properties= _.keys(bot);

  //Filter out hidden properties and any functions.
  //Assume "true" state for all non-hidden properties
  properties = _(properties)
                  .filter(function (v,i,a) {
                    return ( !_.contains(hideDash, v) && !_.isFunction(bot[v]) );
                  })
                  .map(function (v,i,a) {
                    return {
                      label: v,
                      state: true
                    };
                  })
                  .valueOf();
  return properties;
}

function parseTarget(handle,key,target) {
  var bot       = Bot.bots[handle] || CONFIG.bots[handle],
      target    = target || bot[key];

  if (_.contains(bot.hideDash, key) || (_.isEmpty(target) && !_.isNumber(target) && !_.isBoolean(target)) ) {
    //Hidden or empty value
    target = "No value stored";
  }
  else {
    //Stringify the object, unless it's a Number or already a String
    if (!_.isNumber(target) && !_.isString(target))
      target = JSON.stringify(target,null,'\t');
  }

  return target;
}

var updateActions = {
  "prependValue": function prependValue(target, newValue, type, join) {
    join = join || "";

    if (type === "string") {
      target = newValue + join + target;
    }
    else if (type === "number") {
      target += newValue;
    }
    else if (type === "array") {
      target.unshift(newValue);
    }
    else if (type === "object") {
      _.extend(target, newValue);
    }
    else {
      console.log("This shouldn't happen. (from prependValue)");
    }

    return target;
  },

  "appendValue": function appendValue(target, newValue, type, join) {
    join = join || "";

    if (type === "string") {
      target += join + newValue;
    }
    else if (type === "number") {
      target += newValue;
    }
    else if (type === "array") {
      target.push(newValue);
    }
    else if (type === "object") {
      _.extend(target, newValue);
    }
    else {
      console.log("This shouldn't happen. (from appendValue)");
    }

    return target;
  },

  "subtractValue": function subtractValue(target, newValue, type) {
    if (type === "string") {
      subtractRe = RegExp(newValue, "ig");
      target = target.replace(subtractRe,"");
    }
    else if (type === "number") {
      target -= newValue;
    }
    else if (type === "array") {
      target = _.without(target, newValue);
    }
    else if (type === "object") {
      delete target[newValue];
    }
    else {
      console.log("This shouldn't happen. (from subtractValue)");
    }

    return target;
  }
};

function updateProperty(req, res, update, action, forEach, joiner) {
 //TODO: All these || fallbacks lose false-y values (0, false, '')
  var update    = update           || req.body           || null,
      action    = action           || update.action      || "replace",
      forEach   = forEach          || update.forEach     || false,
      joiner    = joiner           || update.joiner      || "",
      handle    = update.handle    || req.params.handle  || null,
      key       = update.key       || req.params.key     || null,
      newValue  = update.content,
      bots      = Bot.bots         || false,
      bot       = bots[handle]     || false,
      target    = bot[key]         || null,
      targetType,
      storedBots= botStates        || CONFIG.bots;

  //Trusting you if you specify createKey action (TODO: add validation?)
  if (action === "createKey") {
    try {bots[handle][key] = newValue;}
      catch (e) { return {"error": e}; }
    return {"success": "Added " + newValue + " as " + key + " in " + handle};
  }

  //No bot, or specified property not found, or it's a function? ERROR.
  if (!bot || !target || _.isFunction(target)) {
    return {"error": "Could not access " + key + " for " + handle};
  }

  //Here are actions that ignore targetType:
  if (action === "replaceValue") {
    bots[handle][key] = newValue;
    return {"success": "Replaced " + key + " in " + handle};
  }
  else if (action === "deleteValue") {
    delete bots[handle][key];
    return {"success": "Deleted " + key + " in " + handle + "(if extant)"};
  }
  else if (action === "restoreValue") {
    bots[handle][key] = storedBots[handle][key] || bots[handle][key];
    return {"attempt": "Tried restoring " + key + " in " + handle + " from stored (success unclear)"};
  }
  else if (action === "defaultValue") {
    bots[handle][key] = CONFIG.bots[handle][key] || bots[handle][key];
    return {"attempt": "Tried restoring " + key + " in " + handle + " from CONFIG (success unclear)"};
  }
  //Otherwise, we branch behavior based on targetType
  else {
    targetType = utils.findType(target);
    //Only act on targets that are String, Number, Array or plain Object
    if (targetType === "unknown") {
      return {"error": "No known behavior for " + key + " in " + handle};
    }

    if (forEach && newValue instanceof Array) {
      //reverse array if we're prepending (preserve expected order)
      if (action === "prependValue")
        newValue = newValue.reverse();

      //Call update action for each value in newValue array
      _.each(newValue, function(nv,i,a) {
        target = updateActions[action].call(this, target, nv, targetType, joiner);
      });
    }
    else {
      target = updateActions[action].call(this, target, newValue, targetType, joiner);
    }

    return {"success": "Performed " + action + " on " + key + " in " + handle};
  }
}

function updateProperties(req, res) {
  var outcome   = null;
  res.updateLog = {};

  _.each(req.body.changes, function (update, index, changes) {
    outcome     = updateProperty(req, res, update);

    if (outcome.success)
      res.updateLog.successes ? res.updateLog.successes.push(outcome.success) : res.updateLog.successes = [outcome.success];
    else if (outcome.attempt)
      res.updateLog.attempts ? res.updateLog.attempts.push(outcome.attempt) : res.updateLog.attempts = [outcome.attempt];
    else if (outcome.error)
      res.updateLog.errors ? res.updateLog.errors.push(outcome.error) : res.updateLog.errors = [outcome.error];
  });

  if ((res.updateLog.successes || res.updateLog.attempts) && res.updateLog.errors)
    res.statusCode = 207;
  else if (res.updateLog.errors)
    res.statusCode = 500;
  else
    res.statusCode = 200;

  //console.log(JSON.stringify(Bot.bots,null,"  "));
  res.send(JSON.stringify(res.updateLog,null,"  "));
}

module.exports.updateProperties = updateProperties;
module.exports.updateProperty = updateProperty;
module.exports.updateActions = updateActions;
module.exports.botsWithState = botsWithState;
module.exports.propertiesWithState = propertiesWithState;
module.exports.parseTarget = parseTarget;
