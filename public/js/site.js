(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- nav scroll state ---------- */

  var nav = document.getElementById("site-nav");
  function onScroll() {
    if (window.scrollY > 24) nav.classList.add("is-scrolled");
    else nav.classList.remove("is-scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on scroll ---------- */

  var revealables = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("lit"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("lit");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealables.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 6, 4) * 70) + "ms";
      io.observe(el);
    });
    // Safety net: if the observer never fires (odd embedded browsers),
    // anything near the viewport still lights up shortly after load.
    setTimeout(function () {
      revealables.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.05) {
          el.classList.add("lit");
        }
      });
    }, 1400);
  }

  /* ---------- fixed scroll arrows ----------
     Ported from the Built By Bean site: up chevron pinned under the nav,
     down chevron pinned to the bottom. Steps section by section; each
     arrow hides at its end of the page. */

  var upBtn = document.querySelector(".scroll-arrow-up");
  var downBtn = document.querySelector(".scroll-arrow-down");
  if (upBtn && downBtn) {
    var scrollSections = Array.prototype.slice.call(document.querySelectorAll(".hero, .section"));
    var scrollingTimer = null;

    var beginArrowScroll = function () {
      document.documentElement.classList.add("is-scrolling");
      clearTimeout(scrollingTimer);
      scrollingTimer = setTimeout(function () {
        document.documentElement.classList.remove("is-scrolling");
      }, 900);
    };

    var smoothScrollTo = function (el) {
      if (!el) return;
      el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    };

    var currentSectionIndex = function () {
      var centerY = window.scrollY + window.innerHeight / 2;
      var idx = 0;
      for (var i = 0; i < scrollSections.length; i++) {
        if (scrollSections[i].offsetTop <= centerY) idx = i;
      }
      return idx;
    };

    var updateScrollNav = function () {
      var i = currentSectionIndex();
      upBtn.hidden = !scrollSections[i - 1];
      downBtn.hidden = !scrollSections[i + 1];
    };

    upBtn.addEventListener("click", function () {
      beginArrowScroll();
      smoothScrollTo(scrollSections[currentSectionIndex() - 1]);
    });
    downBtn.addEventListener("click", function () {
      beginArrowScroll();
      smoothScrollTo(scrollSections[currentSectionIndex() + 1]);
    });

    window.addEventListener("scroll", updateScrollNav, { passive: true });
    window.addEventListener("resize", updateScrollNav);
    updateScrollNav();
  }

  /* ---------- rising embers ---------- */

  var canvas = document.getElementById("embers");
  if (canvas && !reducedMotion) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var particles = [];
    var running = true;
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

    var frame = 0;

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

    document.addEventListener("visibilitychange", function () {
      var wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) requestAnimationFrame(tick);
    });

    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(tick);
  }

  /* ---------- terminal demo ----------
     Every line below is genuine engine output, captured verbatim
     from the game's opening. */

  var SCRIPT = [
    { type: "line", cls: "t-title", text: "VAULT OF ASH", pause: 420 },
    { type: "line", cls: "t-subtitle", text: "Phase 1 — Complete Text Adventure", pause: 340 },
    { type: "line", cls: "t-system", text: "You enter the ruins of Veyrholm seeking a relic no living hand remembers. Type HELP for commands.", pause: 620 },
    { type: "line", cls: "t-location", text: "Ruined Entrance", pause: 300 },
    { type: "line", cls: "t-narrative", text: "A stair of dark stone descends beneath the broken foundations of Veyrholm. Wind combs ash through the archway behind you.", pause: 260 },
    { type: "line", cls: "t-narrative", text: "You came for a relic that has outlived a city. At the threshold, a dry torch rests in an old wall bracket. North, the stair disappears into the Vault.", pause: 260 },
    { type: "line", cls: "t-system", text: "Visible: torch.", pause: 160 },
    { type: "line", cls: "t-system", text: "Exits: north.", pause: 900 },
    { type: "cmd", text: "take torch", pause: 260 },
    { type: "line", cls: "t-success", text: "Taken: torch.", pause: 750 },
    { type: "cmd", text: "use torch", pause: 260 },
    { type: "line", cls: "t-success", text: "You strike a spark against the wall. The torch catches, filling the stone around you with amber light.", pause: 400 }
  ];

  var screen = document.getElementById("demo-screen");
  var replayBtn = document.getElementById("demo-replay");
  if (screen) {
    var timers = [];
    var played = false;

    function clearTimers() {
      timers.forEach(function (t) { clearTimeout(t); });
      timers = [];
    }

    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

    function renderInstant() {
      screen.innerHTML = "";
      SCRIPT.forEach(function (step) {
        var p = document.createElement("p");
        if (step.type === "cmd") {
          p.className = "t-command";
          p.textContent = "> " + step.text;
        } else {
          p.className = step.cls;
          p.textContent = step.text;
        }
        screen.appendChild(p);
      });
      appendCursor();
    }

    function appendCursor() {
      var cur = document.createElement("p");
      cur.className = "t-command";
      cur.innerHTML = "&gt; <span class=\"t-cursor\"></span>";
      screen.appendChild(cur);
    }

    function play() {
      clearTimers();
      screen.innerHTML = "";
      if (reducedMotion) { renderInstant(); return; }
      var delay = 250;
      SCRIPT.forEach(function (step) {
        if (step.type === "cmd") {
          delay += 320;
          (function (step, startDelay) {
            later(function () {
              var p = document.createElement("p");
              p.className = "t-command";
              p.textContent = "> ";
              screen.appendChild(p);
              scrollBottom();
              var chars = step.text.split("");
              chars.forEach(function (ch, ci) {
                later(function () {
                  p.textContent += ch;
                }, 46 * ci);
              });
            }, startDelay);
          })(step, delay);
          delay += step.text.length * 46 + step.pause;
        } else {
          (function (step, startDelay) {
            later(function () {
              var p = document.createElement("p");
              p.className = step.cls;
              p.textContent = step.text;
              screen.appendChild(p);
              scrollBottom();
            }, startDelay);
          })(step, delay);
          delay += step.pause;
        }
      });
      later(function () {
        appendCursor();
        scrollBottom();
      }, delay + 350);
    }

    function scrollBottom() {
      screen.scrollTop = screen.scrollHeight;
    }

    if ("IntersectionObserver" in window && !reducedMotion) {
      var demoIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !played) {
            played = true;
            play();
            demoIO.disconnect();
          }
        });
      }, { threshold: 0.35 });
      demoIO.observe(screen);
    } else {
      renderInstant();
    }

    if (replayBtn) {
      replayBtn.addEventListener("click", function () {
        played = true;
        play();
      });
    }
  }
})();
