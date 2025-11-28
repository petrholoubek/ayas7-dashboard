// menu-load.js
fetch("menu.html")
 .then(response => response.text())
 .then(data => {
   document.getElementById("main-menu").innerHTML = data;
 })
 .catch(err => console.error("Menu load error:", err));
