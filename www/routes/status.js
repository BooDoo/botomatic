exports.index = function(req, res, bots, properties, target) {
  res.render('index', { title: "Botomatic", url: req.url, bots: bots, properties: properties || false, target: target || false});
};

exports.bots = function(req, res, bots) {
  res.render('bots', {url: req.url, bots: bots}); //, function(err, html) {if (err) throw err; console.log(html); res.send(200, html);});
};

exports.properties = function(req, res, properties) {
  res.render('properties', {url: req.url, properties: properties}); //, function(err, html) {if (err) throw err; res.send(200, html);});
};

exports.target = function(req, res, target) {
  res.render('target', {url: req.url, target: target}); //, function(err, html) {if (err) throw err; console.log(html); res.send(200, html);});
};

exports.object = function(req, res, target){
  res.render('object', { title: "Botomatic", target: target});
};
