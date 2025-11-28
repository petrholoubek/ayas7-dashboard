document.addEventListener("DOMContentLoaded", () => {
   const menuContainer = document.getElementById("menu");

   if (menuContainer) {
       fetch("assets/html/menu.html")
           .then(response => response.text())
           .then(data => {
               menuContainer.innerHTML = data;
           })
           .catch(err => {
               console.error("Menu failed to load:", err);
               menuContainer.innerHTML = "<p style='color:red;'>Menu load error</p>";
           });
   }
});
