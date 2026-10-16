// Loads the help desk avatar after the storefront loader finishes,
// so it never competes with the hero for bandwidth.
(function () {
  var src = new URL('helpdesk-v9.js', (document.currentScript && document.currentScript.src) || location.href).href;
  var started = false;
  function load() {
    if (started) return;
    started = true;
    var s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    document.body.appendChild(s);
  }
  function check() {
    if (!document.querySelector('.is-booting')) return setTimeout(load, 600);
    setTimeout(check, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check);
  else check();
  setTimeout(load, 12000); // safety net
})();
