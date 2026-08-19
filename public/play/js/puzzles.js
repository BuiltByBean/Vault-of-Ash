(function (root) {
  "use strict";

  var LIFT_PARTS = {
    crank_handle: { flag: "crankInstalled", label: "crank handle" },
    oil_flask: { flag: "mechanismOiled", label: "oil" },
    old_chain: { flag: "chainInstalled", label: "old chain" }
  };

  var HINTS = {
    sealedDoor: [
      "The sealed door's lock is shaped rather deliberately. Examine it and the objects in the nearby rooms.",
      "A key with flame-like teeth would fit the northern door in Ember Passage.",
      "Take the Ash Key from the Armory, then USE ASH KEY ON SEALED DOOR."
    ],
    lift: [
      "The lift itself appears mostly intact. Examine its missing mechanisms.",
      "The lift needs something to turn it, something to lubricate it, and something capable of supporting its weight.",
      "You need the crank handle, oil flask, and old chain. Use each on the lift mechanism in any order."
    ],
    furnace: [
      "The gallery cannot be crossed by timing the vents. The Wardens wore protection here.",
      "A mineral-thread cloak becomes heat-resistant when treated with the resin kept by the chapel.",
      "Take the Warden Cloak and Ash Resin, then COMBINE WARDEN CLOAK WITH ASH RESIN."
    ],
    seals: [
      "Three teachings divide the sequence. Search the Library, Keeper's Tomb, and Charred Chapel.",
      "The burned thing begins. The dead stand in the middle. Sacred fire wakes only after both.",
      "At the Three-Seal Door, enter SET SEAL ASH BONE FLAME."
    ],
    finale: [
      "The Cinderheart can be taken, bound, destroyed, or freed, but some choices require what you have carried and learned.",
      "A Warden Token and binding lore permit renewal. The Ashen Blade permits destruction. The truth recorded by Serath and the Observatory permits release.",
      "Explore every readable record if you seek a choice beyond taking the relic. The Ember Shard answers most strongly to one very old name."
    ],
    general: [
      "Use LOOK to review the room, INSPECT objects, and READ anything that carries writing.",
      "The current location's unexplored exits and visible items are listed by LOOK. The LORE command reviews what you have learned.",
      "If a puzzle blocks you, return to its room and use HINT again for a more direct clue."
    ]
  };

  function installLiftPart(state, itemId) {
    var part = LIFT_PARTS[itemId];
    if (!part) return { handled: false };
    if (part.flag === "mechanismOiled") {
      if (state.puzzles.lift.mechanismOiled) return { handled: true, changed: false, message: "The lift gears are already oiled." };
    } else if (state.puzzles.lift[part.flag]) {
      return { handled: true, changed: false, message: "The " + part.label + " is already installed." };
    }

    state.puzzles.lift[part.flag] = true;
    var completed = state.puzzles.lift.crankInstalled && state.puzzles.lift.mechanismOiled && state.puzzles.lift.chainInstalled;
    if (completed) state.puzzles.lift.repaired = true;
    return { handled: true, changed: true, completed: completed, part: part };
  }

  function checkSealSequence(symbols) {
    var clean = symbols.map(function (symbol) { return String(symbol).toLowerCase(); });
    var validSymbols = clean.length === 3 && clean.every(function (symbol) {
      return symbol === "ash" || symbol === "bone" || symbol === "flame";
    });
    return {
      validSymbols: validSymbols,
      correct: validSymbols && clean[0] === "ash" && clean[1] === "bone" && clean[2] === "flame"
    };
  }

  function nextHint(state, key) {
    var list = HINTS[key] || HINTS.general;
    var current = state.hints[key] || 0;
    var index = Math.min(current, list.length - 1);
    state.hints[key] = Math.min(current + 1, list.length);
    return { level: index + 1, total: list.length, text: list[index] };
  }

  var api = {
    LIFT_PARTS: LIFT_PARTS,
    HINTS: HINTS,
    installLiftPart: installLiftPart,
    checkSealSequence: checkSealSequence,
    nextHint: nextHint
  };

  root.VaultPuzzles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
