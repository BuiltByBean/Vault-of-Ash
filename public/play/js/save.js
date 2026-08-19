(function (root) {
  "use strict";

  var World = root.VaultWorld;
  if (!World && typeof require !== "undefined") World = require("./world.js");

  var STORAGE_KEY = "vault-of-ash-save-v1";
  var AUTO_KEY = "vault-of-ash-autosave-v1";
  var PREFIX = "VOA1:";

  function utf8ToBase64(text) {
    if (typeof btoa === "function") {
      return btoa(unescape(encodeURIComponent(text)));
    }
    return Buffer.from(text, "utf8").toString("base64");
  }

  function base64ToUtf8(text) {
    if (typeof atob === "function") {
      return decodeURIComponent(escape(atob(text)));
    }
    return Buffer.from(text, "base64").toString("utf8");
  }

  function validateState(state) {
    if (!state || typeof state !== "object") return { ok: false, error: "The save does not contain game data." };
    if (state.saveVersion !== World.SAVE_VERSION) return { ok: false, error: "This save was created by an incompatible version of Vault of Ash." };
    if (!World.ROOMS[state.currentRoom]) return { ok: false, error: "The save refers to an unknown location." };
    if (state.maxHealth !== World.MAX_HEALTH || !Number.isInteger(state.health) || state.health < 0 || state.health > World.MAX_HEALTH) return { ok: false, error: "The save contains an invalid health value." };
    if (!Array.isArray(state.inventory) || !state.inventory.every(function (id) { return Boolean(World.ITEMS[id]); }) || new Set(state.inventory).size !== state.inventory.length) return { ok: false, error: "The save contains invalid inventory data." };
    if (!state.roomItems || typeof state.roomItems !== "object") return { ok: false, error: "The save is missing room item data." };
    var roomIds = Object.keys(World.ROOMS);
    if (!roomIds.every(function (roomId) {
      return Array.isArray(state.roomItems[roomId]) && state.roomItems[roomId].every(function (id) { return Boolean(World.ITEMS[id]); });
    })) return { ok: false, error: "The save contains invalid room item data." };
    if (!Array.isArray(state.visitedRooms) || !state.visitedRooms.every(function (id) { return Boolean(World.ROOMS[id]); })) return { ok: false, error: "The save contains invalid exploration data." };
    if (!Array.isArray(state.lore) || !state.lore.every(function (id) { return Boolean(World.LORE[id]); }) || new Set(state.lore).size !== state.lore.length) return { ok: false, error: "The save contains invalid lore data." };
    if (!state.puzzles || !state.hints || !state.flags) return { ok: false, error: "The save is missing puzzle data." };
    var lift = state.puzzles.lift;
    if (!lift || [
      state.puzzles.sealedDoorUnlocked,
      state.puzzles.ashCloakMade,
      state.puzzles.sealsSolved,
      state.puzzles.bladeForged,
      lift.crankInstalled,
      lift.mechanismOiled,
      lift.chainInstalled,
      lift.repaired
    ].some(function (value) { return typeof value !== "boolean"; })) return { ok: false, error: "The save contains invalid puzzle flags." };
    if (!Number.isInteger(state.puzzles.sealAttempts) || state.puzzles.sealAttempts < 0) return { ok: false, error: "The save contains invalid puzzle history." };
    var hintKeys = ["sealedDoor", "lift", "furnace", "seals", "finale", "general"];
    if (!hintKeys.every(function (key) { return Number.isInteger(state.hints[key]) && state.hints[key] >= 0 && state.hints[key] <= 3; })) return { ok: false, error: "The save contains invalid hint data." };
    if (typeof state.flags.torchLit !== "boolean" || typeof state.flags.chamberAwake !== "boolean" ||
        !Number.isInteger(state.flags.emberPassageEntries) || state.flags.emberPassageEntries < 0 ||
        !Number.isInteger(state.flags.furnaceEntries) || state.flags.furnaceEntries < 0) return { ok: false, error: "The save contains invalid hazard data." };
    if (typeof state.gameOver !== "boolean" || [null, "death", "thief", "warden", "ash", "ember", "name"].indexOf(state.ending) === -1) return { ok: false, error: "The save contains invalid ending data." };
    if (!Number.isInteger(state.turnCount) || state.turnCount < 0) return { ok: false, error: "The save contains invalid turn data." };
    return { ok: true };
  }

  function serialize(state) {
    return JSON.stringify({ format: "VaultOfAshSave", version: World.SAVE_VERSION, state: state });
  }

  function deserialize(text) {
    try {
      var wrapper = JSON.parse(text);
      if (!wrapper || wrapper.format !== "VaultOfAshSave" || wrapper.version !== World.SAVE_VERSION) {
        return { ok: false, error: "The save format is not recognized or is incompatible." };
      }
      var validation = validateState(wrapper.state);
      if (!validation.ok) return validation;
      return { ok: true, state: World.clone(wrapper.state) };
    } catch (error) {
      return { ok: false, error: "The save data is corrupted or incomplete." };
    }
  }

  function exportPortable(state) {
    return PREFIX + utf8ToBase64(serialize(state));
  }

  function importPortable(text) {
    var compact = String(text || "").replace(/\s+/g, "");
    if (compact.indexOf(PREFIX) !== 0) return { ok: false, error: "Portable saves must begin with " + PREFIX };
    try {
      return deserialize(base64ToUtf8(compact.slice(PREFIX.length)));
    } catch (error) {
      return { ok: false, error: "The portable save string is invalid or damaged." };
    }
  }

  function writeLocal(state, automatic) {
    try {
      localStorage.setItem(automatic ? AUTO_KEY : STORAGE_KEY, serialize(state));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: "Browser storage is unavailable. Use EXPORT SAVE for a portable backup." };
    }
  }

  function readLocal(preferManual) {
    try {
      var text = null;
      if (preferManual) text = localStorage.getItem(STORAGE_KEY);
      if (!text) text = localStorage.getItem(AUTO_KEY);
      if (!text) return { ok: false, error: "No saved game was found in this browser." };
      return deserialize(text);
    } catch (error) {
      return { ok: false, error: "Browser storage could not be read." };
    }
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    AUTO_KEY: AUTO_KEY,
    serialize: serialize,
    deserialize: deserialize,
    validateState: validateState,
    exportPortable: exportPortable,
    importPortable: importPortable,
    writeLocal: writeLocal,
    readLocal: readLocal
  };

  root.VaultSave = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
