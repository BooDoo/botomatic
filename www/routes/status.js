exports.index = function(req, res, buttons){
  res.render('index', { title: "Botomatic", buttons: buttons});
};

exports.object = function(req, res, target){
  res.render('object', { title: "Botomatic", target: target});
};
