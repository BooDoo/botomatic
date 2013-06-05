exports.index = function(req, res, handles){
  res.render('index', { title: "Botomatic", handles: handles});
};

exports.object = function(req, res, objString){
  res.render('object', { title: "Botomatic", objString: objString});
};
