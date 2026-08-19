(function () {
  "use strict";

  /*
   * Command assist for the play page — injected by the server; the game's
   * files are untouched and its parser stays the sole authority. This layer
   * only helps COMPOSE valid commands:
   *   - exit buttons and clickable nouns for the current room
   *   - autocomplete suggestions while typing (Tab or click to accept)
   * Everything is submitted through the game's own form, so behavior,
   * saves, and history work exactly as shipped.
   *
   * Context comes from the game's public data (VaultWorld) plus what the
   * game already shows in the DOM (current location, carried inventory).
   */

  var World = window.VaultWorld;
  var form = document.getElementById("command-form");
  var input = document.getElementById("command-input");
  var locationEl = document.getElementById("location-value");
  var inventoryEl = document.getElementById("inventory-list");
  var terminal = form ? form.parentElement : null;
  if (!World || !World.ROOMS || !form || !input || !locationEl || !inventoryEl || !terminal) return;

  var OBJECT_VERBS = ["go", "take", "use", "inspect", "read", "combine"];
  var STANDALONE_VERBS = ["look", "inventory", "lore", "hint", "help", "status", "save", "load", "export save", "import save", "restart"];
  var DIR_GLYPHS = { north: "↑", south: "↓", west: "←", east: "→", up: "⤴", down: "⤵" };
  // Items that ever appeared in the inventory this session; consumables
  // vanish from the inventory when used and must not resurface as
  // takeable room chips.
  var everCarried = Object.create(null);

  /* ---------- context from game data + DOM ---------- */

  function currentRoom() {
    var name = (locationEl.textContent || "").trim();
    var ids = Object.keys(World.ROOMS);
    for (var i = 0; i < ids.length; i++) {
      if (World.ROOMS[ids[i]].name === name) return World.ROOMS[ids[i]];
    }
    return null;
  }

  function carriedNames() {
    var names = [];
    var items = inventoryEl.querySelectorAll("li");
    for (var i = 0; i < items.length; i++) {
      if (items[i].classList.contains("empty")) continue;
      var name = items[i].textContent.trim().toLowerCase();
      if (name) {
        names.push(name);
        everCarried[name] = true;
      }
    }
    return names;
  }

  function roomItemNames(room) {
    var carried = carriedNames();
    return (room.items || [])
      .map(function (id) { return World.ITEMS[id] ? World.ITEMS[id].name : null; })
      .filter(function (name) {
        return name && carried.indexOf(name.toLowerCase()) === -1 && !everCarried[name.toLowerCase()];
      });
  }

  function collectionNames(room, key) {
    var out = [];
    var collection = room[key] || {};
    for (var k in collection) {
      if (Object.prototype.hasOwnProperty.call(collection, k)) out.push(collection[k].name);
    }
    return out;
  }

  function readableNames(room) {
    var names = collectionNames(room, "readables");
    if (carriedNames().indexOf("bone tablet") !== -1 && names.indexOf("bone tablet") === -1) {
      names.push("bone tablet");
    }
    return names;
  }

  function exitNames(room) {
    return Object.keys(room.exits || {});
  }

  /* ---------- UI scaffolding ---------- */

  var wrap = document.createElement("div");
  wrap.id = "voa-assist";
  wrap.setAttribute("aria-label", "Command assistance");
  var contextRow = document.createElement("div");
  contextRow.id = "voa-assist-context";
  var suggestRow = document.createElement("div");
  suggestRow.id = "voa-assist-suggest";
  suggestRow.hidden = true;
  wrap.appendChild(contextRow);
  wrap.appendChild(suggestRow);
  terminal.insertBefore(wrap, form);

  var style = document.createElement("style");
  style.textContent =
    "#voa-assist{border-top:1px solid #2c2619;background:#0d0d0b}" +
    "#voa-assist-context,#voa-assist-suggest{display:flex;flex-wrap:wrap;align-items:center;gap:.4rem;padding:.55rem 1rem}" +
    "#voa-assist-suggest{border-top:1px dotted #2c2619}" +
    ".voa-kicker{color:#706a5b;font-size:.62rem;letter-spacing:.16em;text-transform:uppercase;margin-right:.15rem}" +
    ".voa-chip{border:1px solid #3a3529;background:#211d16;color:#cfc4a9;font:inherit;font-size:.74rem;padding:.28rem .6rem;border-radius:2px;cursor:pointer;transition:border-color .15s,color .15s}" +
    ".voa-chip:hover{border-color:#c6a868;color:#fff6db}" +
    ".voa-chip:focus-visible{outline:2px solid #f1a05d;outline-offset:2px}" +
    ".voa-exit{color:#f0c394;border-color:#60482f;background:#2a2014}" +
    ".voa-exit:hover{border-color:#f1a05d}" +
    ".voa-hint{color:#706a5b;font-size:.68rem;margin-left:auto}" +
    "@media (max-width:540px){#voa-assist-context,#voa-assist-suggest{padding:.5rem .7rem}.voa-hint{display:none}}";
  document.head.appendChild(style);

  function chip(label, title, className, onClick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "voa-chip" + (className ? " " + className : "");
    b.textContent = label;
    if (title) b.title = title;
    b.addEventListener("click", onClick);
    return b;
  }

  function kicker(text) {
    var s = document.createElement("span");
    s.className = "voa-kicker";
    s.textContent = text;
    return s;
  }

  function run(command) {
    input.value = command;
    form.requestSubmit();
    renderContext();
  }

  function setInput(text) {
    input.value = text;
    input.focus();
    input.setSelectionRange(text.length, text.length);
    renderSuggestions();
  }

  function cap(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  /* ---------- context row (idle state) ---------- */

  function renderContext() {
    contextRow.textContent = "";
    var room = currentRoom();
    if (!room) return;

    var exits = exitNames(room);
    if (exits.length) {
      contextRow.appendChild(kicker("Exits"));
      exits.forEach(function (dir) {
        contextRow.appendChild(chip((DIR_GLYPHS[dir] || "") + " " + cap(dir), "Go " + dir, "voa-exit", function () { run(dir); }));
      });
    }

    var items = roomItemNames(room);
    var targets = collectionNames(room, "targets");
    var reads = collectionNames(room, "readables");
    if (items.length || targets.length || reads.length) {
      contextRow.appendChild(kicker("Here"));
      items.forEach(function (name) {
        contextRow.appendChild(chip(name, "Take the " + name, null, function () { run("take " + name); }));
      });
      reads.forEach(function (name) {
        contextRow.appendChild(chip(name, "Read the " + name, null, function () { run("read " + name); }));
      });
      targets.forEach(function (name) {
        contextRow.appendChild(chip(name, "Look at the " + name, null, function () { run("inspect " + name); }));
      });
    }

    var carried = carriedNames();
    if (carried.length) {
      contextRow.appendChild(kicker("Carried"));
      carried.forEach(function (name) {
        contextRow.appendChild(chip(name, "Use the " + name, null, function () { setInput("use " + name + " "); }));
      });
    }

    var hint = document.createElement("span");
    hint.className = "voa-hint";
    hint.textContent = "Tab completes · Enter sends";
    contextRow.appendChild(hint);
  }

  /* ---------- typing suggestions ---------- */

  var suggestions = [];

  function clean(text) {
    return text.toLowerCase().replace(/\s+/g, " ").replace(/^\s+/, "");
  }

  function startsWith(name, partial) {
    return partial === "" || name.toLowerCase().indexOf(partial) === 0;
  }

  function nounSuggestions(names, partial, build) {
    var seen = Object.create(null);
    var out = [];
    names.forEach(function (name) {
      var key = name.toLowerCase();
      if (seen[key] || !startsWith(name, partial)) return;
      seen[key] = true;
      out.push(build(name));
    });
    return out;
  }

  function computeSuggestions() {
    var room = currentRoom();
    if (!room) return [];
    var raw = clean(input.value);
    if (!raw) return [];
    var carried = carriedNames();
    var out = [];

    var space = raw.indexOf(" ");
    var first = space === -1 ? raw : raw.slice(0, space);
    var rest = space === -1 ? null : raw.slice(space + 1);

    // Still typing the first word: offer verbs and exits.
    if (rest === null) {
      exitNames(room).forEach(function (dir) {
        if (startsWith(dir, raw)) out.push({ label: (DIR_GLYPHS[dir] || "") + " " + dir, insert: null, submit: dir });
      });
      STANDALONE_VERBS.forEach(function (verb) {
        if (startsWith(verb, raw) && verb !== raw) out.push({ label: verb, insert: null, submit: verb });
      });
      OBJECT_VERBS.forEach(function (verb) {
        if (verb !== "go" && startsWith(verb, raw)) out.push({ label: verb + " …", insert: verb + " ", submit: null });
      });
      return out;
    }

    // First word finished: suggest objects for the verb.
    if (first === "go") {
      return nounSuggestions(exitNames(room), rest, function (dir) {
        return { label: (DIR_GLYPHS[dir] || "") + " " + dir, insert: null, submit: "go " + dir };
      });
    }
    if (first === "take" || first === "get") {
      return nounSuggestions(roomItemNames(room), rest, function (name) {
        return { label: name, insert: null, submit: first + " " + name };
      });
    }
    if (first === "read") {
      return nounSuggestions(readableNames(room), rest, function (name) {
        return { label: name, insert: null, submit: "read " + name };
      });
    }
    if (first === "inspect" || first === "examine" || first === "x") {
      var everything = roomItemNames(room).concat(carried, collectionNames(room, "targets"), collectionNames(room, "readables"));
      return nounSuggestions(everything, rest, function (name) {
        return { label: name, insert: null, submit: first + " " + name };
      });
    }
    if (first === "use") {
      var onIndex = rest.indexOf(" on ");
      if (onIndex !== -1) {
        var used = rest.slice(0, onIndex);
        var targetPartial = rest.slice(onIndex + 4);
        var interactables = collectionNames(room, "targets").concat(collectionNames(room, "readables"));
        return nounSuggestions(interactables, targetPartial, function (name) {
          return { label: "on " + name, insert: null, submit: "use " + used + " on " + name };
        });
      }
      var exactItem = null;
      carried.forEach(function (name) { if (name === rest.trim()) exactItem = name; });
      if (exactItem) {
        out.push({ label: "↵ use " + exactItem, insert: null, submit: "use " + exactItem });
        collectionNames(room, "targets").forEach(function (name) {
          out.push({ label: "on " + name, insert: null, submit: "use " + exactItem + " on " + name });
        });
        return out;
      }
      return nounSuggestions(carried, rest, function (name) {
        return { label: name, insert: "use " + name + " ", submit: null };
      });
    }
    if (first === "combine") {
      var withIndex = rest.indexOf(" with ");
      if (withIndex !== -1) {
        var firstItem = rest.slice(0, withIndex);
        var secondPartial = rest.slice(withIndex + 6);
        return nounSuggestions(carried.filter(function (n) { return n !== firstItem.trim(); }), secondPartial, function (name) {
          return { label: "with " + name, insert: null, submit: "combine " + firstItem + " with " + name };
        });
      }
      var exactFirst = null;
      carried.forEach(function (name) { if (name === rest.trim()) exactFirst = name; });
      if (exactFirst) {
        return carried.filter(function (n) { return n !== exactFirst; }).map(function (name) {
          return { label: "with " + name, insert: null, submit: "combine " + exactFirst + " with " + name };
        });
      }
      return nounSuggestions(carried, rest, function (name) {
        return { label: name, insert: "combine " + name + " ", submit: null };
      });
    }
    return out;
  }

  function renderSuggestions() {
    suggestions = computeSuggestions().slice(0, 8);
    suggestRow.textContent = "";
    if (!suggestions.length) {
      suggestRow.hidden = true;
      return;
    }
    suggestRow.hidden = false;
    suggestions.forEach(function (s) {
      suggestRow.appendChild(chip(s.label, null, null, function () { accept(s); }));
    });
  }

  function accept(s) {
    if (s.submit !== null) run(s.submit);
    else setInput(s.insert);
    if (s.submit !== null) {
      suggestions = [];
      suggestRow.hidden = true;
      input.focus();
    }
  }

  input.addEventListener("input", renderSuggestions);

  input.addEventListener("keydown", function (event) {
    if (event.key === "Tab" && !event.shiftKey && suggestions.length) {
      event.preventDefault();
      accept(suggestions[0]);
      return;
    }
    if (event.key === "Escape" && !suggestRow.hidden) {
      suggestions = [];
      suggestRow.hidden = true;
    }
    if (event.key === "Enter") {
      suggestions = [];
      suggestRow.hidden = true;
      window.setTimeout(renderContext, 50);
    }
  });

  /* ---------- keep context in sync with the game ---------- */

  var refreshQueued = false;
  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.setTimeout(function () {
      refreshQueued = false;
      renderContext();
    }, 30);
  }

  new MutationObserver(queueRefresh).observe(locationEl, { childList: true, characterData: true, subtree: true });
  new MutationObserver(queueRefresh).observe(inventoryEl, { childList: true, subtree: true });

  renderContext();
})();
