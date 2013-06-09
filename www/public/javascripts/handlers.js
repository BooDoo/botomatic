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