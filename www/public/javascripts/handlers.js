function botClickHandler(e) {
  var handle = e.target.innerText,
      endpoint = e.target.href,
      postReq = new XMLHttpRequest(),
      otherPrimary = document.getElementsByClassName('pure-button-bot pure-button-primary')[0],
      updateElement = document.getElementById('properties-column');

  if (otherPrimary) otherPrimary.classList.remove('pure-button-primary');
  e.target.classList.add('pure-button-primary');
  postReq.open("POST", endpoint, true);
  postReq.onreadystatechange = function() {
    if (postReq.readyState !== 4 || postReq.status !== 200) return;
    updateElement.innerHTML = postReq.responseText;
    document.getElementById('value-column').innerHTML = "";
  }
  postReq.send({"handle": handle});
  e.preventDefault();
}

function propertyClickHandler(e) {
  var key = e.target.innerText,
      endpoint = e.target.href,
      postReq = new XMLHttpRequest(),
      otherPrimary = document.getElementsByClassName('pure-button-property pure-button-primary')[0],
      updateElement = document.getElementById('value-column');

  if (otherPrimary) otherPrimary.classList.remove('pure-button-primary');
  e.target.classList.add('pure-button-primary');
  postReq.open("POST", endpoint, true);
  postReq.onreadystatechange = function() {
    if (postReq.readyState !== 4 || postReq.status !== 200) return;
    updateElement.innerHTML = postReq.responseText;
  }
  postReq.send({"key": key});
  e.preventDefault();
}
