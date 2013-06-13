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
      if (postReq.status === 200 || postReq.status === 207) { //All good (confirmed, or assumed)
        target.classList.remove('pure-button-failed');
        target.innerText = "Success"
      }
      else if (postReq.status === 500) { //Some kind of problem committing new value
        target.classList.add('pure-button-failed');
        target.innerText = "Failure";
        target.onclick = "";
      }
      else if (postReq.status === 401) { //Passport rejected authorization
        target.classList.add('pure-button-failed');
        target.classList.remove('pure-button-disabled');
        target.innerText = "Retry?";
      }
    return postReq.status;
    }
  };
  postReq.send(payload);
}
