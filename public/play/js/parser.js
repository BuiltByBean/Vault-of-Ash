(function (root) {
  "use strict";

  var DIRECTION_ALIASES = {
    n: "north", north: "north",
    s: "south", south: "south",
    e: "east", east: "east",
    w: "west", west: "west",
    u: "up", up: "up",
    d: "down", down: "down"
  };

  function cleanText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanObject(text) {
    return cleanText(text)
      .replace(/^(the|a|an)\s+/, "")
      .replace(/\s+(the|a|an)\s+/g, " ")
      .trim();
  }

  function parse(input) {
    var raw = cleanText(input);
    var match;

    if (!raw) return { verb: "empty" };

    if (DIRECTION_ALIASES[raw]) {
      return { verb: "go", direction: DIRECTION_ALIASES[raw] };
    }

    match = raw.match(/^go(?:\s+(.*))?$/);
    if (match) {
      if (!match[1]) return { verb: "incomplete", message: "Go where?" };
      var direction = DIRECTION_ALIASES[cleanObject(match[1])];
      if (!direction) return { verb: "go", direction: cleanObject(match[1]) };
      return { verb: "go", direction: direction };
    }

    if (/^(help|commands|\?)$/.test(raw)) return { verb: "help" };
    if (/^(look|l)$/.test(raw)) return { verb: "look" };
    if (/^(inventory|inv|i)$/.test(raw)) return { verb: "inventory" };
    if (raw === "status") return { verb: "status" };
    if (raw === "lore") return { verb: "lore" };
    if (raw === "hint") return { verb: "hint" };
    if (raw === "save") return { verb: "save" };
    if (raw === "load") return { verb: "load" };
    if (raw === "export save" || raw === "export") return { verb: "exportSave" };
    if (raw === "import save" || raw === "import") return { verb: "importSave" };
    if (raw === "restart" || raw === "new game") return { verb: "restart" };
    if (raw === "quit" || raw === "exit game") return { verb: "quit" };

    match = raw.match(/^(?:look at|inspect|examine|x)(?:\s+(.*))?$/);
    if (match) {
      if (!match[1]) return { verb: "incomplete", message: "Examine what?" };
      return { verb: "inspect", object: cleanObject(match[1]) };
    }

    match = raw.match(/^read(?:\s+(.*))?$/);
    if (match) {
      if (!match[1]) return { verb: "incomplete", message: "Read what?" };
      return { verb: "read", object: cleanObject(match[1]) };
    }

    match = raw.match(/^(?:take|get|pick up)(?:\s+(.*))?$/);
    if (match) {
      if (!match[1]) return { verb: "incomplete", message: "Take what?" };
      return { verb: "take", object: cleanObject(match[1]) };
    }

    match = raw.match(/^use(?:\s+(.*))?$/);
    if (match) {
      if (!match[1]) return { verb: "incomplete", message: "Use what?" };
      var useText = match[1];
      var onIndex = useText.indexOf(" on ");
      if (onIndex !== -1) {
        var item = cleanObject(useText.slice(0, onIndex));
        var target = cleanObject(useText.slice(onIndex + 4));
        if (!target) return { verb: "incomplete", message: "Use the " + item + " on what?" };
        return { verb: "use", item: item, target: target };
      }
      if (/\son$/.test(useText)) {
        var incompleteItem = cleanObject(useText.replace(/\son$/, ""));
        return { verb: "incomplete", message: "Use the " + incompleteItem + " on what?" };
      }
      return { verb: "use", item: cleanObject(useText), target: null };
    }

    match = raw.match(/^combine(?:\s+(.*))?$/);
    if (match) {
      if (!match[1]) return { verb: "incomplete", message: "Combine what with what?" };
      var combineText = match[1];
      var withIndex = combineText.indexOf(" with ");
      if (withIndex === -1) return { verb: "incomplete", message: "Combine it with what?" };
      var first = cleanObject(combineText.slice(0, withIndex));
      var second = cleanObject(combineText.slice(withIndex + 6));
      if (!second) return { verb: "incomplete", message: "Combine the " + first + " with what?" };
      return { verb: "combine", first: first, second: second };
    }

    match = raw.match(/^set seal(?:\s+(.*))?$/);
    if (match) {
      if (!match[1]) return { verb: "incomplete", message: "Set the seals in what order?" };
      var symbols = cleanText(match[1]).split(" ").filter(Boolean);
      return { verb: "setSeal", symbols: symbols };
    }

    match = raw.match(/^(bind|free|destroy)(?:\s+(.*))?$/);
    if (match) {
      if (!match[2]) return { verb: "incomplete", message: match[1].charAt(0).toUpperCase() + match[1].slice(1) + " what?" };
      return { verb: match[1], object: cleanObject(match[2]) };
    }

    match = raw.match(/^speak(?:\s+(.*))?$/);
    if (match) {
      if (!match[1]) return { verb: "incomplete", message: "Speak what name?" };
      return { verb: "speak", name: cleanObject(match[1]) };
    }

    return { verb: "unknown", raw: raw };
  }

  var api = { parse: parse, cleanText: cleanText, cleanObject: cleanObject };
  root.VaultParser = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
