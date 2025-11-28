// menu-load.js
document.addEventListener('DOMContentLoaded', function () {
 const placeholder = document.getElementById('main-menu');
 if (!placeholder) {
   console.error('main-menu element not found');
   return;
 }

 // menu.html musí být ve STEJNÉ složce jako tahle stránka
 fetch('menu.html', { cache: 'no-cache' })
   .then(function (response) {
     if (!response.ok) {
       throw new Error('HTTP error ' + response.status);
     }
     return response.text();
   })
   .then(function (html) {
     placeholder.innerHTML = html;
   })
   .catch(function (err) {
     console.error('Chyba při načítání menu:', err);
     placeholder.innerHTML = '';
   });
});
