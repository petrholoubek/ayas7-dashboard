// menu-load.js
document.addEventListener("DOMContentLoaded", () => {
 // Cesta musí být relativní ke stránce kde se nacházím → stejná složka
 fetch("menu.html")
   .then(response => {
     if (!response.ok) {
       throw new Error("Menu load error: " + response.status);
     }
     return response.text();
   })
   .then(html => {
     document.getElementById("main-menu").innerHTML = html;
   })
   .catch(err => {
     console.error(err);
     document.getElementById("main-menu").innerHTML = "<p style='color:red;'>Menu se nepodařilo načíst.</p>";
   });
});
