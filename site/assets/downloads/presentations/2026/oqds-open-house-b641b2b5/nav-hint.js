// Visible navigation for the hosted deck. Added by orfe-site, not part of the Slidev build.
// Each press of › steps through one click animation or moves to the next slide. A row of
// step marks under the slide number shows how many builds the current slide has and how
// many are shown, and it pulses when a press advances a build instead of the slide.
(function () {
  "use strict";
  var TOTAL = 10;

  // Slidev provides its navigation state to the Vue app under this key.
  function slidevNav() {
    var app = document.querySelector("#app");
    var ctx = app && app.__vue_app__ && app.__vue_app__._context.provides["$$slidev-context"];
    return ctx && ctx.nav && typeof ctx.nav.next === "function" ? ctx.nav : null;
  }

  function slideNumber() {
    var m = location.hash.match(/^#\/(\d+)/);
    if (m) return Number(m[1]);
    return location.hash === "" || location.hash === "#/" ? 1 : null; // null: presenter, overview, etc.
  }

  function state() {
    var n = slideNumber();
    var nav = slidevNav();
    if (nav) return { page: n, clicks: Number(nav.clicks) || 0, total: Number(nav.clicksTotal) || 0 };
    var m = location.hash.match(/[?&]clicks=(\d+)/);
    return { page: n, clicks: m ? Number(m[1]) : 0, total: 0 };
  }

  // Fallback when the Slidev state is not reachable: send the arrow keys it handles.
  function press(key) {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: key, code: key, bubbles: true }));
    setTimeout(function () {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: key, code: key, bubbles: true }));
    }, 50);
  }

  function button(label, text, method, key) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.title = label;
    b.textContent = text;
    b.addEventListener("click", function () {
      var nav = slidevNav();
      if (nav) nav[method](); else press(key);
      dismissHint();
    });
    return b;
  }

  var nav = document.createElement("nav");
  nav.id = "orfe-nav";
  nav.setAttribute("aria-label", "Slide navigation");
  var prevBtn = button("Previous", "‹", "prev", "ArrowLeft");
  var nextBtn = button("Next", "›", "next", "ArrowRight");
  var count = document.createElement("span");
  count.className = "orfe-count";
  var countText = document.createElement("span");
  countText.className = "orfe-count-text";
  var steps = document.createElement("span");
  steps.className = "orfe-steps";
  steps.setAttribute("aria-hidden", "true");
  count.appendChild(countText);
  count.appendChild(steps);
  var live = document.createElement("span");
  live.className = "orfe-sr";
  live.setAttribute("aria-live", "polite");
  nav.appendChild(prevBtn);
  nav.appendChild(count);
  nav.appendChild(nextBtn);
  nav.appendChild(live);

  var hint = document.createElement("div");
  hint.id = "orfe-hint";
  hint.textContent = "Press › or the arrow keys to step through. Many slides build up over several clicks. " +
    "The marks under the slide number show the builds left.";

  function dismissHint() { hint.classList.add("orfe-hide"); }

  var last = { page: undefined, clicks: undefined, total: undefined };

  function render(s) {
    var visible = s.page !== null;
    nav.style.display = visible ? "" : "none";
    if (!visible) { dismissHint(); return; }

    countText.textContent = s.page + " / " + TOTAL;
    var total = Math.max(s.total, s.clicks);
    if (steps.childElementCount !== total) {
      steps.textContent = "";
      for (var i = 0; i < total; i++) steps.appendChild(document.createElement("i"));
    }
    for (var j = 0; j < total; j++) steps.children[j].classList.toggle("orfe-done", j < s.clicks);
    nav.classList.toggle("orfe-has-steps", total > 0);

    var building = total > 0 && s.clicks < total;
    nextBtn.title = building ? "Next build step (" + (s.clicks + 1) + " of " + total + ")" : "Next slide";
    prevBtn.title = s.clicks > 0 ? "Previous build step" : "Previous slide";
    live.textContent = "Slide " + s.page + " of " + TOTAL +
      (total > 0 ? ", build step " + s.clicks + " of " + total : "");

    // Same slide, different step: the press advanced an animation, so draw the eye to the marks.
    if (s.page === last.page && s.clicks !== last.clicks && total > 0) {
      steps.classList.remove("orfe-pulse");
      void steps.offsetWidth; // restart the animation
      steps.classList.add("orfe-pulse");
    }
  }

  function update() {
    var s = state();
    if (s.page === last.page && s.clicks === last.clicks && s.total === last.total) return;
    render(s);
    last = s;
  }

  function mount() {
    document.body.appendChild(nav);
    document.body.appendChild(hint);
    update();
    setTimeout(dismissHint, 12000);
  }

  // Slidev changes the route with history.pushState, which fires no event, and it registers
  // a slide's build steps after the slide mounts, so poll the state.
  setInterval(update, 200);
  window.addEventListener("hashchange", update);
  window.addEventListener("keydown", function (e) {
    if (e.isTrusted && /^(Arrow|PageUp|PageDown| $)/.test(e.key)) dismissHint();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
