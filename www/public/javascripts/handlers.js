function clickHandler(e) {
  var target = e.target,
      label = target.innerText,
      endpoint = target.href,
      targetParent = target.parentElement,
      postReq = new XMLHttpRequest(),
      currentPrimary = targetParent.getElementsByClassName('pure-button-primary')[0],
      updateTarget = targetParent.nextElementSibling, //document.getElementById('properties-column');
      clearTarget = updateTarget.nextElementSibling;

  if (currentPrimary)
    currentPrimary.classList.remove('pure-button-primary');

  target.classList.add('pure-button-primary');
  postReq.open("POST", endpoint, true);
  postReq.onreadystatechange = function() {
    if (postReq.readyState !== 4 || (postReq.status !== 200 && postReq.status !== 304) ) return;
    updateTarget.innerHTML = postReq.responseText;
    if (clearTarget)
      clearTarget.innerHTML = "";
  }
  postReq.send({"endpoint": endpoint});
  e.preventDefault();
}

function updateClickHandler(e) {
  var target = e.target,
      endpoint = target.href,
      postReq = new XMLHttpRequest(),
      payload, content,
      dataTarget = document.getElementById('property-value');

  e.preventDefault();
  target.classList.add('pure-button-disabled');

  try {
    content = JSON.parse(dataTarget.innerText);
  }
  catch(e) {
    content = dataTarget.innerText
  }
  //console.log(content);

  payload = { "secret": "supersecret",
              "changes": [
                {
                  "action": "replaceValue",
                  "content": content
                }
              ]
            };
  payload = JSON.stringify(payload);

  postReq.open("POST", endpoint, true);
  postReq.setRequestHeader("Content-Type", "application/json");
  postReq.overrideMimeType("text/plain");
  postReq.onreadystatechange = function() {
    if (postReq.readyState !== 4) {
      if (postReq.status === 200 || postReq.status === 207) {
        target.innerText = "Success"
      }
      else if (postReq.status === 500) {
        target.innerText = "Failure";
      }
    return postReq.status;
    }
  };
  postReq.send(payload);
}
