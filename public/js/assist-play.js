(function () {
  "use strict";

  /*
   * Command assist for the play page — injected by the server; the game's
   * files are untouched and its parser stays the sole authority. This layer
   * only helps COMPOSE valid commands:
   *   - exit buttons and clickable nouns for the current room
   *   - autocomplete suggestions while typing (Tab or click to accept),
   *     matching display names AND the parser's aliases ("m" → marker)
   *   - one-click recovery of a session interrupted by a reload
   *   - a Hide/Assist toggle for players who want the bare prompt
   * Everything is submitted through the game's own form, so behavior,
   * saves, and history work exactly as shipped.
   *
   * Room contents come from the game's own autosave in localStorage (the
   * exact current state, refreshed by the game after each move), falling
   * back to the static world data plus the on-screen inventory when no
   * autosave is readable.
   */

  try {
    var World = window.VaultWorld;
    var form = document.getElementById("command-form");
    var input = document.getElementById("command-input");
    var locationEl = document.getElementById("location-value");
    var inventoryEl = document.getElementById("inventory-list");
    var terminal = form ? form.parentElement : null;
    if (!World || !World.ROOMS || !form || !input || !locationEl || !inventoryEl || !terminal) return;
  } catch (err) {
    return;
  }

  var AUTOSAVE_KEY = "vault-of-ash-autosave-v1";
  var MANUAL_KEY = "vault-of-ash-save-v1";
  var ASSIST_PREF_KEY = "voa-assist-visible";
  var OBJECT_VERBS = ["go", "take", "use", "inspect", "read", "combine"];
  var STANDALONE_VERBS = ["look", "inventory", "lore", "hint", "help", "status", "save", "load", "export save", "import save", "restart"];
  var DIR_GLYPHS = { north: "↑", south: "↓", west: "←", east: "→", up: "⤴", down: "⤵" };
  // Items that ever appeared in the inventory this session — fallback
  // guard so consumables never resurface as takeable room chips even
  // when no autosave is readable.
  var everCarried = Object.create(null);

  /*
   * Session recovery: the game overwrites its recovery autosave at boot,
   * so a preserved pre-boot copy (captured by a head script the server
   * injects) is the only trace of an interrupted session. If it holds
   * real progress, offer a one-click restore through the game's own
   * LOAD command.
   */
  var recovery = null;
  try {
    var preboot = window.__voaPreBoot || null;
    if (preboot) {
      var wrapper = JSON.parse(preboot);
      if (wrapper && wrapper.format === "VaultOfAshSave" && wrapper.state &&
          wrapper.state.turnCount > 0 && !wrapper.state.gameOver) {
        var hasManual = false;
        try { hasManual = !!window.localStorage.getItem(MANUAL_KEY); } catch (err) { hasManual = false; }
        recovery = { raw: preboot, hasManual: hasManual, room: (World.ROOMS[wrapper.state.currentRoom] || {}).name || "" };
      }
    }
  } catch (err) {
    recovery = null;
  }

  /* ---------- context: game autosave first, DOM + static data second ---------- */

  function savedState() {
    try {
      var raw = window.localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      var wrapper = JSON.parse(raw);
      if (!wrapper || wrapper.format !== "VaultOfAshSave" || !wrapper.state || !wrapper.state.roomItems) return null;
      return wrapper.state;
    } catch (err) {
      return null;
    }
  }

  function currentRoom() {
    var name = (locationEl.textContent || "").trim();
    var ids = Object.keys(World.ROOMS);
    for (var i = 0; i < ids.length; i++) {
      if (World.ROOMS[ids[i]].name === name) return { id: ids[i], room: World.ROOMS[ids[i]] };
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

  /* Entries pair a canonical display name with the parser's aliases so
     suggestions match whatever fragment the player starts typing. */

  function itemEntry(id) {
    var item = World.ITEMS[id];
    return item ? { name: item.name, aliases: item.aliases || [] } : null;
  }

  function itemEntryByName(name) {
    var key = name.toLowerCase();
    var ids = Object.keys(World.ITEMS);
    for (var i = 0; i < ids.length; i++) {
      var item = World.ITEMS[ids[i]];
      if (item.name.toLowerCase() === key) return { name: item.name, aliases: item.aliases || [] };
    }
    return { name: name, aliases: [] };
  }

  function carriedEntries() {
    return carriedNames().map(itemEntryByName);
  }

  function roomItemEntries(found) {
    var state = savedState();
    var carried = carriedNames();
    var ids = state && Array.isArray(state.roomItems[found.id]) ? state.roomItems[found.id] : (found.room.items || []);
    return ids
      .map(itemEntry)
      .filter(function (entry) {
        if (!entry) return false;
        var key = entry.name.toLowerCase();
        if (carried.indexOf(key) !== -1) return false;
        // Static fallback only: hide anything we have ever carried.
        if (!state && everCarried[key]) return false;
        return true;
      });
  }

  function collectionEntries(room, key) {
    var out = [];
    var collection = room[key] || {};
    for (var k in collection) {
      if (Object.prototype.hasOwnProperty.call(collection, k)) {
        out.push({ name: collection[k].name, aliases: collection[k].aliases || [] });
      }
    }
    return out;
  }

  function readableEntries(room) {
    var entries = collectionEntries(room, "readables");
    var hasTablet = carriedNames().indexOf("bone tablet") !== -1;
    if (hasTablet && !entries.some(function (e) { return e.name === "bone tablet"; })) {
      entries.push(itemEntryByName("bone tablet"));
    }
    return entries;
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
    ".voa-quiet{border-color:#2c2619;color:#706a5b;margin-left:auto}" +
    ".voa-quiet:hover{color:#a59d88;border-color:#3a3529}" +
    ".voa-hint{color:#706a5b;font-size:.68rem}" +
    ".voa-recover{color:#c7b992;font-size:.74rem;font-style:italic}" +
    "@media (max-width:540px){#voa-assist-context,#voa-assist-suggest{padding:.5rem .7rem}.voa-chip{padding:.45rem .7rem}.voa-hint{display:none}}";
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

  /* ---------- visibility preference ---------- */

  function assistVisible() {
    try {
      return window.localStorage.getItem(ASSIST_PREF_KEY) !== "off";
    } catch (err) {
      return true;
    }
  }

  function setAssistVisible(on) {
    try {
      window.localStorage.setItem(ASSIST_PREF_KEY, on ? "on" : "off");
    } catch (err) { /* session-only preference */ }
    renderContext();
    if (!on) {
      suggestions = [];
      suggestRow.hidden = true;
    }
  }

  /* ---------- context row (idle state) ---------- */

  function renderRecovery() {
    if (!recovery) return;
    var notice = document.createElement("span");
    notice.className = "voa-recover";
    notice.textContent = recovery.hasManual
      ? "A saved game exists."
      : "An interrupted session was found" + (recovery.room ? " (" + recovery.room + ")" : "") + ".";
    contextRow.appendChild(notice);
    contextRow.appendChild(chip(recovery.hasManual ? "Load it" : "Restore it", "Continue where you left off", "voa-exit", function () {
      if (!recovery.hasManual) {
        try { window.localStorage.setItem(AUTOSAVE_KEY, recovery.raw); } catch (err) { /* load falls back to current state */ }
      }
      recovery = null;
      run("load");
    }));
    contextRow.appendChild(chip("Dismiss", "Start fresh instead", null, function () {
      recovery = null;
      renderContext();
      input.focus();
    }));
  }

  function renderContext() {
    contextRow.textContent = "";
    renderRecovery();

    if (!assistVisible()) {
      var restore = chip("☰ Assist", "Show command assistance", "voa-quiet", function () { setAssistVisible(true); });
      contextRow.appendChild(restore);
      return;
    }

    var found = currentRoom();
    if (!found) return;
    var room = found.room;

    var exits = exitNames(room);
    if (exits.length) {
      contextRow.appendChild(kicker("Exits"));
      exits.forEach(function (dir) {
        contextRow.appendChild(chip((DIR_GLYPHS[dir] || "") + " " + cap(dir), "Go " + dir, "voa-exit", function () { run(dir); }));
      });
    }

    var items = roomItemEntries(found);
    var targets = collectionEntries(room, "targets");
    var reads = collectionEntries(room, "readables");
    if (items.length || targets.length || reads.length) {
      contextRow.appendChild(kicker("Here"));
      items.forEach(function (entry) {
        contextRow.appendChild(chip(entry.name, "Take the " + entry.name, null, function () { run("take " + entry.name); }));
      });
      reads.forEach(function (entry) {
        contextRow.appendChild(chip(entry.name, "Read the " + entry.name, null, function () { run("read " + entry.name); }));
      });
      targets.forEach(function (entry) {
        contextRow.appendChild(chip(entry.name, "Look at the " + entry.name, null, function () { run("inspect " + entry.name); }));
      });
    }

    var carried = carriedNames();
    if (carried.length) {
      contextRow.appendChild(kicker("Carried"));
      carried.forEach(function (name) {
        contextRow.appendChild(chip(name, "Use the " + name, null, function () { setInput("use " + name + " "); }));
      });
    }

    contextRow.appendChild(chip("✕", "Hide command assistance", "voa-quiet", function () { setAssistVisible(false); }));

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

  function entryMatches(entry, partial) {
    if (startsWith(entry.name, partial)) return true;
    for (var i = 0; i < entry.aliases.length; i++) {
      if (startsWith(entry.aliases[i], partial)) return true;
    }
    return false;
  }

  function entryEquals(entry, text) {
    var key = text.trim();
    if (entry.name.toLowerCase() === key) return true;
    for (var i = 0; i < entry.aliases.length; i++) {
      if (entry.aliases[i].toLowerCase() === key) return true;
    }
    return false;
  }

  function nounSuggestions(entries, partial, build) {
    var seen = Object.create(null);
    var out = [];
    entries.forEach(function (entry) {
      var key = entry.name.toLowerCase();
      if (seen[key] || !entryMatches(entry, partial)) return;
      seen[key] = true;
      out.push(build(entry.name));
    });
    return out;
  }

  function computeSuggestions() {
    var found = currentRoom();
    if (!found) return [];
    var room = found.room;
    var raw = clean(input.value);
    if (!raw) return [];
    var carried = carriedEntries();
    var out = [];

    // Multi-word verb phrases the parser accepts.
    if (raw.indexOf("pick up") === 0) raw = "take" + raw.slice(7);
    if (raw.indexOf("look at") === 0) raw = "inspect" + raw.slice(7);

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
      return exitNames(room).filter(function (dir) { return startsWith(dir, rest); }).map(function (dir) {
        return { label: (DIR_GLYPHS[dir] || "") + " " + dir, insert: null, submit: "go " + dir };
      });
    }
    if (first === "take" || first === "get") {
      return nounSuggestions(roomItemEntries(found), rest, function (name) {
        return { label: name, insert: null, submit: first + " " + name };
      });
    }
    if (first === "read") {
      return nounSuggestions(readableEntries(room), rest, function (name) {
        return { label: name, insert: null, submit: "read " + name };
      });
    }
    if (first === "inspect" || first === "examine" || first === "x") {
      var everything = roomItemEntries(found).concat(carried, collectionEntries(room, "targets"), collectionEntries(room, "readables"));
      return nounSuggestions(everything, rest, function (name) {
        return { label: name, insert: null, submit: first + " " + name };
      });
    }
    if (first === "use") {
      var onIndex = rest.indexOf(" on ");
      if (onIndex !== -1) {
        var used = rest.slice(0, onIndex);
        var targetPartial = rest.slice(onIndex + 4);
        var interactables = collectionEntries(room, "targets").concat(collectionEntries(room, "readables"));
        return nounSuggestions(interactables, targetPartial, function (name) {
          return { label: "on " + name, insert: null, submit: "use " + used + " on " + name };
        });
      }
      var exactItem = null;
      carried.forEach(function (entry) { if (entryEquals(entry, rest)) exactItem = entry.name; });
      if (exactItem) {
        out.push({ label: "↵ use " + exactItem, insert: null, submit: "use " + exactItem });
        collectionEntries(room, "targets").forEach(function (entry) {
          out.push({ label: "on " + entry.name, insert: null, submit: "use " + exactItem + " on " + entry.name });
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
        var others = carried.filter(function (entry) { return !entryEquals(entry, firstItem); });
        return nounSuggestions(others, secondPartial, function (name) {
          return { label: "with " + name, insert: null, submit: "combine " + firstItem + " with " + name };
        });
      }
      var exactFirst = null;
      carried.forEach(function (entry) { if (entryEquals(entry, rest)) exactFirst = entry.name; });
      if (exactFirst) {
        return carried.filter(function (entry) { return entry.name !== exactFirst; }).map(function (entry) {
          return { label: "with " + entry.name, insert: null, submit: "combine " + exactFirst + " with " + entry.name };
        });
      }
      return nounSuggestions(carried, rest, function (name) {
        return { label: name, insert: "combine " + name + " ", submit: null };
      });
    }
    return out;
  }

  function renderSuggestions() {
    suggestions = assistVisible() ? computeSuggestions().slice(0, 8) : [];
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
    if (s.submit !== null) {
      run(s.submit);
      suggestions = [];
      suggestRow.hidden = true;
      input.focus();
    } else {
      setInput(s.insert);
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

  try {
    new MutationObserver(queueRefresh).observe(locationEl, { childList: true, characterData: true, subtree: true });
    new MutationObserver(queueRefresh).observe(inventoryEl, { childList: true, subtree: true });
  } catch (err) { /* context simply refreshes on submit */ }

  renderContext();
})();
