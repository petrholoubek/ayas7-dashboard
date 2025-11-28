// menu-load.js

document.addEventListener("DOMContentLoaded", async () => {
 const container = document.getElementById("main-menu");

 try {
   // absolutní cesta podle GitHub Pages
   const response = await fetch("/ayas7-dashboard/menu.html");

   if (!response.ok) {
     container.innerHTML = "<div style='color:red;'>Menu se nepodařilo načíst.</div>";
     return;
   }

   const html = await response.text();
   container.innerHTML = html;

 } catch (error) {
   container.innerHTML = "<div style='color:red;'>Menu se nepodařilo načíst.</div>";
 }
});
