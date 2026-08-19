(function () {
  "use strict";

  /*
   * Rising embers for the play page — same particle system as the landing
   * page. Injected by the server alongside the site nav; the game's own
   * files are untouched. Obeys the game's Atmosphere toggle (the game puts
   * .effects-off on <body>) and the OS reduced-motion preference.
   */

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var canvas = document.getElementById("voa-embers");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var particles = [];
  var running = false;
  var frame = 0;
  var W = 0, H = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.round(Math.min(90, Math.max(34, (W * H) / 26000)));
    while (particles.length < target) particles.push(spawn(true));
    particles.length = target;
  }

  function spawn(anywhere) {
    var bright = Math.random() < 0.16;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 8,
      r: bright ? 1.6 + Math.random() * 1.3 : 0.6 + Math.random() * 1.1,
      vy: 0.18 + Math.random() * 0.55,
      drift: (Math.random() - 0.5) * 0.25,
      phase: Math.random() * Math.PI * 2,
      wobble: 0.4 + Math.random() * 0.9,
      alpha: 0.25 + Math.random() * 0.55,
      bright: bright,
      life: 0
    };
  }

  function tick() {
    if (!running) return;
    frame++;
    if (frame % 90 === 0 && (window.innerWidth !== W || window.innerHeight !== H)) {
      resize();
    }
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.life += 0.016;
      p.y -= p.vy;
      p.x += p.drift + Math.sin(p.life * p.wobble + p.phase) * 0.22;
      var fade = Math.min(1, (H - p.y) / (H * 0.12) + 0.15);
      var heightFade = Math.max(0, Math.min(1, p.y / (H * 0.55)));
      var a = p.alpha * fade * (0.25 + heightFade * 0.75);
      var flicker = 0.75 + 0.25 * Math.sin(p.life * 6 + p.phase);
      if (p.y < -10 || p.x < -20 || p.x > W + 20) {
        particles[i] = spawn(false);
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (p.bright) {
        ctx.fillStyle = "rgba(245, 166, 95, " + (a * flicker) + ")";
        ctx.shadowColor = "rgba(240, 130, 55, 0.9)";
        ctx.shadowBlur = 9;
      } else {
        ctx.fillStyle = "rgba(198, 118, 62, " + (a * flicker * 0.8) + ")";
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    requestAnimationFrame(tick);
  }

  function effectsOff() {
    return document.body.classList.contains("effects-off");
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, W, H);
  }

  function sync() {
    setRunning(!document.hidden && !effectsOff());
  }

  document.addEventListener("visibilitychange", sync);
  var toggle = document.getElementById("effects-toggle");
  if (toggle) toggle.addEventListener("change", sync);
  window.addEventListener("resize", resize);

  resize();
  sync();
})();
