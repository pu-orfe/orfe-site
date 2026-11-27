// Visible navigation for the hosted deck. Added by orfe-site, not part of the Slidev build.
// The buttons send the arrow-key events that Slidev already handles, so each press
// steps through one click animation or moves to the next slide.
(function () {
  "use strict";
  var TOTAL = 10;

  function slideNumber() {
    var m = location.hash.match(/^#\/(\d+)/);
    if (m) return Number(m[1]);
    return location.hash === "" || location.hash === "#/" ? 1 : null; // null: presenter, overview, etc.
  }

  function press(key) {
    ["keydown", "keyup"].forEach(function (type) {
      window.dispatchEvent(new KeyboardEvent(type, { key: key, code: key, bubbles: true }));
    });
  }

  function button(label, text, key) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.title = label;
    b.textContent = text;
    b.addEventListener("click", function () { press(key); dismissHint(); });
    return b;
  }

  var nav = document.createElement("nav");
  nav.id = "orfe-nav";
  nav.setAttribute("aria-label", "Slide navigation");
  var count = document.createElement("span");
  count.className = "orfe-count";
  count.setAttribute("aria-live", "polite");
  nav.appendChild(button("Previous", "‹", "ArrowLeft"));
  nav.appendChild(count);
  nav.appendChild(button("Next", "›", "ArrowRight"));

  var hint = document.createElement("div");
  hint.id = "orfe-hint";
  hint.textContent = "Press › or the arrow keys to step through. Many slides build up over several clicks.";

  function dismissHint() { hint.classList.add("orfe-hide"); }

  function update() {
    var n = slideNumber();
    var visible = n !== null;
    nav.style.display = visible ? "" : "none";
    if (!visible) dismissHint();
    if (n !== null) count.textContent = n + " / " + TOTAL;
  }

  function mount() {
    document.body.appendChild(nav);
    document.body.appendChild(hint);
    update();
    setTimeout(dismissHint, 12000);
  }

  // Slidev changes the route with history.pushState, which fires no event, so watch the URL.
  var lastHref = location.href;
  setInterval(function () {
    if (location.href !== lastHref) { lastHref = location.href; update(); }
  }, 200);
  window.addEventListener("hashchange", update);
  window.addEventListener("keydown", function (e) {
    if (e.isTrusted && /^(Arrow|PageUp|PageDown| $)/.test(e.key)) dismissHint();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
