exports.index = function(req, res, buttons){
  res.render('index', { title: "Botomatic", buttons: buttons});
};

exports.object = function(req, res, objString){
  res.render('object', { title: "Botomatic", objString: objString});
};
