(function (root) {
  "use strict";

  var World = root.VaultWorld;
  var Parser = root.VaultParser;
  var Puzzles = root.VaultPuzzles;
  var Save = root.VaultSave;

  if (typeof require !== "undefined") {
    World = World || require("./world.js");
    Parser = Parser || require("./parser.js");
    Puzzles = Puzzles || require("./puzzles.js");
    Save = Save || require("./save.js");
  }

  function line(text, type) {
    return { text: text, type: type || "narrative" };
  }

  function result(messages, changed, action) {
    return { messages: messages || [], changed: Boolean(changed), action: action || null };
  }

  function hasAll(array, required) {
    return required.every(function (value) { return array.indexOf(value) !== -1; });
  }

  function Engine(initialState) {
    this.state = initialState ? World.clone(initialState) : World.createInitialState();
  }

  Engine.prototype.begin = function () {
    var messages = [
      line("VAULT OF ASH", "title"),
      line("Phase 1 — Complete Text Adventure", "subtitle"),
      line("You enter the ruins of Veyrholm seeking a relic no living hand remembers. Type HELP for commands.", "system")
    ];
    return result(messages.concat(this.describeRoom(true)), true);
  };

  Engine.prototype.restore = function (state) {
    var validation = Save.validateState(state);
    if (!validation.ok) return result([line(validation.error, "error")]);
    this.state = World.clone(state);
    return result([
      line("Saved game restored.", "success")
    ].concat(this.describeRoom(false)), false);
  };

  Engine.prototype.restart = function () {
    this.state = World.createInitialState();
    return this.begin();
  };

  Engine.prototype.currentRoom = function () {
    return World.ROOMS[this.state.currentRoom];
  };

  Engine.prototype.hasItem = function (itemId) {
    return this.state.inventory.indexOf(itemId) !== -1;
  };

  Engine.prototype.addItem = function (itemId) {
    if (!this.hasItem(itemId)) this.state.inventory.push(itemId);
  };

  Engine.prototype.removeItem = function (itemId) {
    var index = this.state.inventory.indexOf(itemId);
    if (index !== -1) this.state.inventory.splice(index, 1);
  };

  Engine.prototype.itemIdFromName = function (query, candidates) {
    var clean = Parser.cleanObject(query);
    var ids = candidates || Object.keys(World.ITEMS);
    for (var i = 0; i < ids.length; i += 1) {
      var id = ids[i];
      var item = World.ITEMS[id];
      if (Parser.cleanObject(item.name) === clean) return id;
      if (item.aliases.some(function (alias) { return Parser.cleanObject(alias) === clean; })) return id;
    }
    return null;
  };

  Engine.prototype.findRoomObject = function (query, collectionName) {
    var clean = Parser.cleanObject(query);
    var collection = this.currentRoom()[collectionName] || {};
    var keys = Object.keys(collection);
    for (var i = 0; i < keys.length; i += 1) {
      var object = collection[keys[i]];
      if (Parser.cleanObject(object.name) === clean) return object;
      if (object.aliases.some(function (alias) { return Parser.cleanObject(alias) === clean; })) return object;
    }
    return null;
  };

  Engine.prototype.registerLore = function (loreIds) {
    var discovered = [];
    var self = this;
    (loreIds || []).forEach(function (id) {
      if (World.LORE[id] && self.state.lore.indexOf(id) === -1) {
        self.state.lore.push(id);
        discovered.push(id);
      }
    });
    return discovered;
  };

  Engine.prototype.describeRoom = function (entering) {
    var room = this.currentRoom();
    var first = this.state.visitedRooms.indexOf(this.state.currentRoom) === -1;
    var messages = [line(room.name, "location"), line(room.baseDescription)];

    if (entering || first) messages.push(line(first ? room.firstVisit : room.repeatVisit));
    else messages.push(line(room.repeatVisit));

    if (first) this.state.visitedRooms.push(this.state.currentRoom);

    if (this.state.currentRoom === "ember_passage" && this.state.puzzles.sealedDoorUnlocked) {
      messages.push(line("The sealed door now stands unlocked, opening north.", "success"));
    }
    if (this.state.currentRoom === "broken_lift") {
      var lift = this.state.puzzles.lift;
      var repairs = [];
      if (lift.crankInstalled) repairs.push("crank installed");
      if (lift.mechanismOiled) repairs.push("gears oiled");
      if (lift.chainInstalled) repairs.push("chain installed");
      if (lift.repaired) messages.push(line("The repaired lift is ready to descend.", "success"));
      else if (repairs.length) messages.push(line("Lift repairs: " + repairs.join("; ") + ".", "system"));
    }
    if (this.state.currentRoom === "three_seal_door" && this.state.puzzles.sealsSolved) {
      messages.push(line("The Three-Seal Door is open to the north.", "success"));
    }

    var visibleItems = this.state.roomItems[this.state.currentRoom] || [];
    if (visibleItems.length) {
      messages.push(line("Visible: " + visibleItems.map(function (id) { return World.ITEMS[id].name; }).join(", ") + ".", "system"));
    }

    var exits = Object.keys(room.exits).map(function (direction) {
      if (room.name === "Ember Passage" && direction === "north" && !this.state.puzzles.sealedDoorUnlocked) return direction + " (sealed)";
      if (room.name === "Broken Lift" && direction === "down" && !this.state.puzzles.lift.repaired) return direction + " (lift broken)";
      if (room.name === "Furnace Gallery" && direction === "north" && !this.hasItem("ash_cloak")) return direction + " (extreme heat)";
      if (room.name === "Three-Seal Door" && direction === "north" && !this.state.puzzles.sealsSolved) return direction + " (sealed)";
      return direction;
    }, this);
    messages.push(line("Exits: " + exits.join(", ") + ".", "system"));
    return messages;
  };

  Engine.prototype.damage = function (amount, cause) {
    this.state.health = Math.max(0, this.state.health - amount);
    var messages = [
      line(cause, "danger"),
      line("*** You took " + amount + " damage. ***", "danger"),
      line("Health: " + this.state.health + "/" + this.state.maxHealth, "danger")
    ];
    if (this.state.health === 0) {
      this.state.gameOver = true;
      this.state.ending = "death";
      messages.push(line("THE VAULT CLAIMS ANOTHER", "ending"));
      messages.push(line("Your strength leaves you among the old stones. The truth below remains buried.", "narrative"));
      messages.push(line("Type RESTART, LOAD, or QUIT.", "system"));
    }
    return messages;
  };

  Engine.prototype.move = function (direction) {
    var room = this.currentRoom();
    if (!room.exits[direction]) {
      return result([line("You cannot go " + direction + " from here.", "error")]);
    }

    if (this.state.currentRoom === "ember_passage" && direction === "north" && !this.state.puzzles.sealedDoorUnlocked) {
      return result([line("The sealed door blocks the northern passage. Its flame-shaped lock has not been opened.", "error")]);
    }
    if (this.state.currentRoom === "broken_lift" && direction === "down" && !this.state.puzzles.lift.repaired) {
      return result([line("The lift cannot descend until its crank, lubrication, and chain have been restored.", "error")]);
    }
    if (this.state.currentRoom === "furnace_gallery" && direction === "north" && !this.hasItem("ash_cloak")) {
      var blockedHeat = this.damage(2, "You try to cross, but the next furnace vent forces you back through blistering air.");
      return result(blockedHeat.concat(this.state.gameOver ? [] : [line("Proper heat protection is required.", "error")]), true);
    }
    if (this.state.currentRoom === "three_seal_door" && direction === "north" && !this.state.puzzles.sealsSolved) {
      return result([line("The circular door remains sealed. Its three symbols must be set in the proper order.", "error")]);
    }

    this.state.currentRoom = room.exits[direction];
    var messages = [];

    if (this.state.currentRoom === "ember_passage") {
      this.state.flags.emberPassageEntries += 1;
      if (!this.state.flags.torchLit) {
        messages = messages.concat(this.damage(2, "In the darkness, your boot finds a glowing crack. Heat bites through the sole before you regain safe stone."));
        if (this.state.gameOver) return result(messages, true);
        messages.push(line("A steady light would reveal a safer path.", "system"));
      } else {
        messages.push(line("Your torch reveals the safe stone between the ember cracks.", "success"));
      }
    }

    if (this.state.currentRoom === "furnace_gallery") {
      this.state.flags.furnaceEntries += 1;
      if (!this.hasItem("ash_cloak")) {
        messages = messages.concat(this.damage(3, "The Furnace Gallery's first exhalation strikes like an opened oven. You retreat to the threshold, skin burning."));
        if (this.state.gameOver) return result(messages, true);
      } else {
        messages.push(line("Heat presses against the Ash Cloak, but the treated fabric holds.", "success"));
      }
    }

    if (this.state.currentRoom === "true_relic_chamber") this.state.flags.chamberAwake = true;
    messages = messages.concat(this.describeRoom(true));
    return result(messages, true);
  };

  Engine.prototype.inspect = function (query) {
    if (/^(me|myself|self)$/.test(query)) {
      return result([line("You are tired, ash-streaked, and still standing. Health: " + this.state.health + "/" + this.state.maxHealth + ".")]);
    }

    var candidates = this.state.inventory.concat(this.state.roomItems[this.state.currentRoom] || []);
    if (this.state.currentRoom === "true_relic_chamber") candidates = candidates.concat(["cinderheart"]);
    var itemId = this.itemIdFromName(query, candidates);
    if (itemId) return result([line(World.ITEMS[itemId].description)]);

    var roomTarget = this.findRoomObject(query, "targets");
    if (roomTarget) return result([line(roomTarget.description)]);

    var readable = this.findRoomObject(query, "readables");
    if (readable) return result([line(readable.name + " bears writing. Try READ " + readable.name.toUpperCase() + ".", "system")]);

    return result([line("You find nothing here matching “" + query + ".”", "error")]);
  };

  Engine.prototype.read = function (query) {
    var readable = this.findRoomObject(query, "readables");
    if (!readable && this.hasItem("bone_tablet") && this.itemIdFromName(query, ["bone_tablet"])) {
      readable = { name: "bone tablet", text: "BONE IS NOT DEATH ALONE. IT IS THE SHAPE MEMORY KEEPS WHEN HEAT HAS PASSED.", lore: ["attempted_binding"] };
    }
    if (!readable) return result([line("There is nothing readable here matching “" + query + ".”", "error")]);

    var discovered = this.registerLore(readable.lore);
    var messages = [line(readable.name, "readable"), line(readable.text)];
    discovered.forEach(function (id) {
      messages.push(line("Lore discovered: " + World.LORE[id].title + ".", "lore"));
    });
    return result(messages, discovered.length > 0);
  };

  Engine.prototype.take = function (query) {
    if (this.state.currentRoom === "true_relic_chamber" && this.itemIdFromName(query, ["cinderheart"])) {
      return this.finishEnding("thief");
    }

    var roomItems = this.state.roomItems[this.state.currentRoom] || [];
    var itemId = this.itemIdFromName(query, roomItems);
    if (!itemId) {
      var ownedId = this.itemIdFromName(query, this.state.inventory);
      if (ownedId) return result([line("You already carry the " + World.ITEMS[ownedId].name + ".", "system")]);
      return result([line("You cannot take “" + query + "” here.", "error")]);
    }

    roomItems.splice(roomItems.indexOf(itemId), 1);
    this.addItem(itemId);
    var messages = [line("Taken: " + World.ITEMS[itemId].name + ".", "success")];
    if (itemId === "ember_shard") {
      messages.push(line("The shard warms in your palm, then answers a deeper pulse from beneath the floor. This is no legendary heart—only a splinter shed from something below.", "reveal"));
      messages.push(line("The true Vault continues west toward the broken lift.", "system"));
    }
    if (itemId === "bone_tablet") messages.push(line("Its carved middle verse may help order the three seals.", "system"));
    return result(messages, true);
  };

  Engine.prototype.use = function (itemQuery, targetQuery) {
    var itemId = this.itemIdFromName(itemQuery, this.state.inventory);
    if (!itemId) return result([line("You are not carrying “" + itemQuery + ".”", "error")]);

    if (itemId === "torch" && !targetQuery) {
      if (this.state.flags.torchLit) return result([line("The torch is already burning steadily.", "system")]);
      this.state.flags.torchLit = true;
      return result([line("You strike a spark against the wall. The torch catches, filling the stone around you with amber light.", "success")], true);
    }

    if (itemId === "bandage" && (!targetQuery || /^(self|me|myself)$/.test(targetQuery))) {
      if (this.state.health >= this.state.maxHealth) return result([line("You are already at full health. The bandage remains unused.", "system")]);
      var before = this.state.health;
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 4);
      this.removeItem("bandage");
      return result([line("You bind your injuries and recover " + (this.state.health - before) + " health.", "success"), line("Health: " + this.state.health + "/" + this.state.maxHealth, "system")], true);
    }

    if (itemId === "water_flask" && (!targetQuery || /^(self|me|myself|burn|burns)$/.test(targetQuery))) {
      if (this.state.health >= this.state.maxHealth) return result([line("You save the water; you do not need it now.", "system")]);
      this.state.health = Math.min(this.state.maxHealth, this.state.health + 1);
      this.removeItem("water_flask");
      return result([line("The mineral water cools your burns. You recover 1 health, but it will not protect you from the furnace.", "success"), line("Health: " + this.state.health + "/" + this.state.maxHealth, "system")], true);
    }

    var target = targetQuery ? Parser.cleanObject(targetQuery) : "";

    if (itemId === "ash_key" && target && /^(sealed door|door|northern door|lock)$/.test(target)) {
      if (this.state.currentRoom !== "ember_passage") return result([line("There is no matching sealed door here.", "error")]);
      if (this.state.puzzles.sealedDoorUnlocked) return result([line("The sealed door is already unlocked.", "system")]);
      this.state.puzzles.sealedDoorUnlocked = true;
      return result([line("The Ash Key turns with a dry snap. Stone withdraws around the lock, opening the way north.", "success")], true);
    }

    if (Puzzles.LIFT_PARTS[itemId] && target && /^(lift|lift mechanism|mechanism|gears|crank socket|chain mount)$/.test(target)) {
      if (this.state.currentRoom !== "broken_lift") return result([line("There is no lift mechanism here.", "error")]);
      var install = Puzzles.installLiftPart(this.state, itemId);
      if (!install.changed) return result([line(install.message, "system")]);
      this.removeItem(itemId);
      var partMessage;
      if (itemId === "crank_handle") partMessage = "You seat the crank handle in the empty socket. The drive gear turns again.";
      if (itemId === "oil_flask") partMessage = "You work the oil into the dry gear teeth until the mechanism moves without protest.";
      if (itemId === "old_chain") partMessage = "You feed the old chain through the housing and lock its end link into the cage coupling.";
      var installMessages = [line(partMessage, "success")];
      if (install.completed) installMessages.push(line("With all three repairs complete, the lift settles level with the floor. The way down is open.", "reveal"));
      return result(installMessages, true);
    }

    if ((itemId === "chapel_sigil" && target && this.itemIdFromName(target, ["rusted_sword"])) ||
        (itemId === "rusted_sword" && target && this.itemIdFromName(target, ["chapel_sigil"]))) {
      if (!this.hasItem("chapel_sigil") || !this.hasItem("rusted_sword")) return result([line("You need both the chapel sigil and rusted sword.", "error")]);
      return this.combine("chapel sigil", "rusted sword");
    }

    if (itemId === "ash_cloak" && !targetQuery) {
      return result([line("You settle the Ash Cloak around your shoulders. It will protect you automatically in the Furnace Gallery.", "success")]);
    }

    if (!targetQuery) return result([line("Use the " + World.ITEMS[itemId].name + " on what?", "error")]);
    return result([line("The " + World.ITEMS[itemId].name + " has no useful effect on " + targetQuery + ".", "error")]);
  };

  Engine.prototype.combine = function (firstQuery, secondQuery) {
    var first = this.itemIdFromName(firstQuery, this.state.inventory);
    var second = this.itemIdFromName(secondQuery, this.state.inventory);
    if (!first) return result([line("You are not carrying “" + firstQuery + ".”", "error")]);
    if (!second) return result([line("You are not carrying “" + secondQuery + ".”", "error")]);

    var pair = [first, second].sort().join("+");
    if (pair === ["ash_resin", "warden_cloak"].sort().join("+")) {
      this.removeItem("ash_resin");
      this.removeItem("warden_cloak");
      this.addItem("ash_cloak");
      this.state.puzzles.ashCloakMade = true;
      return result([line("You warm the resin in your hands and work it through the cloak's mineral weave. The fabric darkens, stiffens, then becomes strangely cool.", "success"), line("Created: ash cloak.", "reveal")], true);
    }

    if (pair === ["chapel_sigil", "rusted_sword"].sort().join("+")) {
      this.removeItem("chapel_sigil");
      this.removeItem("rusted_sword");
      this.addItem("ashen_blade");
      this.state.puzzles.bladeForged = true;
      return result([line("The chapel sigil locks into the sword's guard. Rust falls away in a silent sheet, revealing a narrow pale edge that drinks the nearby warmth.", "success"), line("Created: ashen blade.", "reveal")], true);
    }

    return result([line("Those items do not combine in any useful way.", "error")]);
  };

  Engine.prototype.setSeal = function (symbols) {
    if (this.state.currentRoom !== "three_seal_door") return result([line("You must stand before the Three-Seal Door to set its symbols.", "error")]);
    if (this.state.puzzles.sealsSolved) return result([line("The seals are already aligned and the door is open.", "system")]);
    if (symbols.length !== 3) return result([line("The door requires exactly three symbols: ASH, BONE, and FLAME in some order.", "error")]);
    var check = Puzzles.checkSealSequence(symbols);
    if (!check.validSymbols) return result([line("The mechanism recognizes only ASH, BONE, and FLAME. It resets without moving.", "error")]);
    this.state.puzzles.sealAttempts += 1;
    if (!check.correct) {
      return result([line("The seals turn—" + symbols.map(function (symbol) { return symbol.toUpperCase(); }).join(", ") + "—then recoil to their starting places. A low note fades into the stone.", "danger"), line("The door remains intact. You may try again.", "system")], true);
    }
    this.state.puzzles.sealsSolved = true;
    return result([line("ASH turns first. BONE answers. FLAME wakes last.", "reveal"), line("The three rings align. Warm air passes through the dark center as the Inner Vault opens north.", "success")], true);
  };

  Engine.prototype.showInventory = function () {
    if (!this.state.inventory.length) return result([line("Inventory: empty.", "system")]);
    return result([line("Inventory: " + this.state.inventory.map(function (id) { return World.ITEMS[id].name; }).join(", ") + ".", "system")]);
  };

  Engine.prototype.showStatus = function () {
    var room = this.currentRoom();
    var ending = this.state.gameOver ? " | Outcome: " + String(this.state.ending).toUpperCase() : "";
    return result([line("Health: " + this.state.health + "/" + this.state.maxHealth + " | Location: " + room.name + " | Lore: " + this.state.lore.length + "/" + Object.keys(World.LORE).length + ending, "system")]);
  };

  Engine.prototype.showLore = function () {
    if (!this.state.lore.length) return result([line("You have not yet assembled any major discoveries. Read the records of the Vault.", "system")]);
    var messages = [line("DISCOVERED LORE", "lore")];
    this.state.lore.forEach(function (id) {
      messages.push(line(World.LORE[id].title + " — " + World.LORE[id].summary, "lore"));
    });
    messages.push(line(this.state.lore.length + " of " + Object.keys(World.LORE).length + " major discoveries recorded.", "system"));
    return result(messages);
  };

  Engine.prototype.hint = function () {
    var key = "general";
    var room = this.state.currentRoom;
    if (!this.state.puzzles.sealedDoorUnlocked && ["hall_of_dust", "armory", "ember_passage", "false_reliquary"].indexOf(room) !== -1) key = "sealedDoor";
    else if (!this.state.puzzles.lift.repaired && ["false_reliquary", "broken_lift", "storeroom", "armory"].indexOf(room) !== -1) key = "lift";
    else if (!this.hasItem("ash_cloak") && ["lift_landing", "warden_barracks", "charred_chapel", "memorial_hall", "furnace_gallery"].indexOf(room) !== -1) key = "furnace";
    else if (!this.state.puzzles.sealsSolved && ["hall_of_three", "ash_garden", "keepers_tomb", "cracked_observatory", "seal_antechamber", "three_seal_door"].indexOf(room) !== -1) key = "seals";
    else if (["inner_sanctum", "keepers_vigil", "cinder_vault", "true_relic_chamber", "escape_tunnel"].indexOf(room) !== -1) key = "finale";
    var hint = Puzzles.nextHint(this.state, key);
    return result([line("Hint " + hint.level + "/" + hint.total + ": " + hint.text, "hint")], true);
  };

  Engine.prototype.help = function () {
    return result([
      line("COMMANDS", "title"),
      line("LOOK • LOOK AT [thing] • INSPECT [thing] • READ [thing]", "system"),
      line("NORTH/SOUTH/EAST/WEST/UP/DOWN • GO [direction]", "system"),
      line("TAKE [item] • USE [item] • USE [item] ON [target] • COMBINE [item] WITH [item]", "system"),
      line("INVENTORY (INV/I) • STATUS • LORE • HINT", "system"),
      line("SAVE • LOAD • EXPORT SAVE • IMPORT SAVE • RESTART • QUIT", "system"),
      line("Puzzle commands will be introduced when needed. Commands ignore capitalization and most uses of “the.”", "system")
    ]);
  };

  Engine.prototype.isCinderheartQuery = function (query) {
    return Boolean(this.itemIdFromName(query, ["cinderheart"]));
  };

  Engine.prototype.finalChoice = function (verb, query) {
    if (!this.isCinderheartQuery(query)) return result([line(verb.charAt(0).toUpperCase() + verb.slice(1) + " what?", "error")]);
    if (this.state.currentRoom !== "true_relic_chamber") return result([line("The Cinderheart is not within reach here.", "error")]);

    if (verb === "bind") {
      var bindingLore = ["attempted_binding", "warden_formation", "vault_purpose"];
      if (!this.hasItem("warden_token")) return result([line("The binding lattice does not answer you. A Keeper's authority was once carried in a Warden Token.", "error")]);
      if (!hasAll(this.state.lore, bindingLore)) return result([line("You do not yet understand enough of the original binding to renew it safely.", "error")]);
      return this.finishEnding("warden");
    }

    if (verb === "destroy") {
      if (!this.hasItem("ashen_blade")) return result([line("No ordinary force will destroy the Cinderheart. You need a Warden edge made to sever the binding itself.", "error")]);
      return this.finishEnding("ash");
    }

    if (verb === "free") {
      var truthLore = ["ember_discovery", "attempted_binding", "serath_doubts", "cinderheart_nature"];
      if (!hasAll(this.state.lore, truthLore)) return result([line("The lattice offers no obvious release. Without the truth of what was bound and why, opening it would be blind destruction.", "error")]);
      return this.finishEnding("ember");
    }

    return result([line("That choice is not understood.", "error")]);
  };

  Engine.prototype.speak = function (name) {
    if (this.state.currentRoom !== "true_relic_chamber") return result([line("Your voice returns from the stone without an answer.", "system")]);
    var cleanName = Parser.cleanObject(name).replace(/[^a-z]/g, "");
    if (cleanName !== World.TRUE_NAME) {
      return result([line("You speak the name into the warm chamber. The Cinderheart gives no sign of recognition.", "system")]);
    }
    if (!this.hasItem("ember_shard") || !hasAll(this.state.lore, World.SECRET_LORE)) {
      return result([line("The name catches in the chamber like a distant echo, but you do not yet hold enough of its history—or enough of its fire—for the meaning to reach it whole.", "reveal")]);
    }
    return this.finishEnding("name");
  };

  Engine.prototype.finishEnding = function (ending) {
    this.state.gameOver = true;
    this.state.ending = ending;
    var endings = {
      thief: [
        line("THE THIEF", "ending"),
        line("You close your hands around the Cinderheart. The lattice releases it almost eagerly.") ,
        line("The old escape tunnel opens as the Vault shudders. You climb into cold evening with the legendary relic wrapped beneath your cloak."),
        line("Days from Veyrholm, beside a fire you did not light, something inside your pack gives one slow heartbeat. Then another.", "reveal")
      ],
      warden: [
        line("THE WARDEN", "ending"),
        line("You press the Warden Token into the open lattice and speak the old terms without the chapel's additions. The black bands draw tight."),
        line("The Cinderheart's last thought is neither rage nor consent. It is recognition. The Vault steadies around you."),
        line("At dawn, the outer passage seals. The mechanism requires a living Keeper. You remain—not as priest or owner, but as the next person responsible for an unfinished choice.", "reveal")
      ],
      ash: [
        line("THE ASH", "ending"),
        line("The Ashen Blade passes through black stone with almost no resistance. For one instant, the chamber contains the light of seven days."),
        line("Then the heartbeat ends. Heat drains from Veyrholm. Frost gathers where ash has lain warm for centuries."),
        line("Far below the emptied lattice, something vast shifts in the newly cold earth. The Cinderheart may have been a prisoner. It may also have been a lamp kept burning over a deeper dark.", "reveal")
      ],
      ember: [
        line("THE EMBER", "ending"),
        line("You open the lattice according to the first design, not the later ritual. The black bands recoil. Fire unfolds through every seam of the Vault."),
        line("It passes around you rather than through you. The Cinderheart rises without wings, becomes a red line in the collapsing dark, and is gone."),
        line("You emerge through the broken tunnel as rain begins over Veyrholm—the first rain to touch the inner ruin in generations. Whether the fire fled, forgave, or simply chose another road, you cannot know.", "reveal")
      ],
      name: [
        line("THE NAME", "ending"),
        line("You do not command the lattice. You speak: Ilyra."),
        line("The Ember Shard answers in your hand. Every record—the wonder, the wound, the fear, the centuries of duty and devotion—meets in a silence deeper than speech."),
        line("The Cinderheart opens. Not for you. By its own will."),
        line("Ilyra leaves the vessel as warmth moving through stone. The Vault does not collapse; it exhales. Outside, one red light crosses the clouds, pauses above the ruin, and chooses the horizon.", "reveal")
      ]
    };
    var messages = endings[ending] || [];
    messages.push(line("Your ending has been reached. Type RESTART, LOAD, or QUIT. Your manual save has not been erased.", "system"));
    return result(messages, true);
  };

  Engine.prototype.execute = function (input) {
    var command = Parser.parse(input);
    if (command.verb === "empty") return result([]);
    this.state.turnCount += 1;

    if (this.state.gameOver) {
      if (command.verb === "restart") return result([line("Restart requested.", "system")], false, "restart");
      if (command.verb === "load") return result([line("Load requested.", "system")], false, "load");
      if (command.verb === "quit") return result([line("Quit requested.", "system")], false, "quit");
      if (command.verb === "look") return result(this.describeRoom(false));
      if (command.verb === "inventory") return this.showInventory();
      if (command.verb === "status") return this.showStatus();
      if (command.verb === "lore") return this.showLore();
      return result([line("The story has ended. You may review LOOK, INVENTORY, STATUS, or LORE, or type RESTART, LOAD, or QUIT.", "system")]);
    }

    switch (command.verb) {
      case "incomplete": return result([line(command.message, "error")]);
      case "unknown": return result([line("The Vault does not understand “" + command.raw + ".” Type HELP for examples.", "error")]);
      case "help": return this.help();
      case "look": return result(this.describeRoom(false));
      case "inspect": return this.inspect(command.object);
      case "read": return this.read(command.object);
      case "go": return this.move(command.direction);
      case "take": return this.take(command.object);
      case "use": return this.use(command.item, command.target);
      case "combine": return this.combine(command.first, command.second);
      case "inventory": return this.showInventory();
      case "status": return this.showStatus();
      case "lore": return this.showLore();
      case "hint": return this.hint();
      case "setSeal": return this.setSeal(command.symbols);
      case "bind": return this.finalChoice("bind", command.object);
      case "free": return this.finalChoice("free", command.object);
      case "destroy": return this.finalChoice("destroy", command.object);
      case "speak": return this.speak(command.name);
      case "save": return result([line("Saving game…", "system")], false, "save");
      case "load": return result([line("Loading game…", "system")], false, "load");
      case "exportSave": return result([], false, "export");
      case "importSave": return result([], false, "import");
      case "restart": return result([], false, "restartConfirm");
      case "quit": return result([], false, "quit");
      default: return result([line("Nothing happens.", "system")]);
    }
  };

  function bootBrowserGame() {
    var transcript = document.getElementById("transcript");
    if (!transcript) return;

    var form = document.getElementById("command-form");
    var input = document.getElementById("command-input");
    var healthValue = document.getElementById("health-value");
    var healthFill = document.getElementById("health-fill");
    var locationValue = document.getElementById("location-value");
    var inventoryList = document.getElementById("inventory-list");
    var loreCount = document.getElementById("lore-count");
    var modal = document.getElementById("modal");
    var modalTitle = document.getElementById("modal-title");
    var modalText = document.getElementById("modal-text");
    var modalInput = document.getElementById("modal-input");
    var modalConfirm = document.getElementById("modal-confirm");
    var modalCancel = document.getElementById("modal-cancel");
    var modalCopy = document.getElementById("modal-copy");
    var effectsToggle = document.getElementById("effects-toggle");
    var engine = new Engine();
    var history = [];
    var historyIndex = 0;
    var modalMode = null;

    function append(messages) {
      messages.forEach(function (message) {
        var entry = document.createElement("div");
        entry.className = "line line--" + (message.type || "narrative");
        String(message.text).split("\n").forEach(function (paragraph, index) {
          if (index) entry.appendChild(document.createElement("br"));
          entry.appendChild(document.createTextNode(paragraph || " "));
        });
        transcript.appendChild(entry);
      });
      transcript.scrollTop = transcript.scrollHeight;
    }

    function echoCommand(text) {
      append([line("> " + text, "command")]);
    }

    function updatePanels() {
      var state = engine.state;
      healthValue.textContent = state.health + "/" + state.maxHealth;
      healthFill.style.width = (state.health / state.maxHealth * 100) + "%";
      healthFill.classList.toggle("is-low", state.health <= 3);
      locationValue.textContent = World.ROOMS[state.currentRoom].name;
      loreCount.textContent = state.lore.length + "/" + Object.keys(World.LORE).length;
      inventoryList.textContent = "";
      if (!state.inventory.length) {
        var empty = document.createElement("li");
        empty.textContent = "Nothing carried";
        empty.className = "empty";
        inventoryList.appendChild(empty);
      } else {
        state.inventory.forEach(function (id) {
          var item = document.createElement("li");
          item.textContent = World.ITEMS[id].name;
          item.title = World.ITEMS[id].description;
          inventoryList.appendChild(item);
        });
      }
    }

    function setModal(mode, title, text, value) {
      modalMode = mode;
      modalTitle.textContent = title;
      modalText.textContent = text;
      modalInput.value = value || "";
      modalInput.readOnly = mode === "export";
      modalInput.hidden = mode === "restart";
      modalCopy.hidden = mode !== "export";
      modalConfirm.textContent = mode === "import" ? "Import" : mode === "restart" ? "Restart" : "Done";
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      if (!modalInput.hidden) modalInput.focus();
      else modalConfirm.focus();
    }

    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      modalMode = null;
      input.focus();
    }

    function handleAction(action) {
      if (!action) return;
      if (action === "save") {
        var saved = Save.writeLocal(engine.state, false);
        append([line(saved.ok ? "Game saved in this browser." : saved.error, saved.ok ? "success" : "error")]);
      } else if (action === "load") {
        var loaded = Save.readLocal(true);
        if (!loaded.ok) append([line(loaded.error, "error")]);
        else append(engine.restore(loaded.state).messages);
      } else if (action === "export") {
        setModal("export", "Portable Save", "Copy this entire text string to a file on your USB drive.", Save.exportPortable(engine.state));
      } else if (action === "import") {
        setModal("import", "Import Portable Save", "Paste a complete Vault of Ash portable save string below.", "");
      } else if (action === "restartConfirm") {
        setModal("restart", "Restart the Game?", "This resets all current progress. Your existing manual save will remain available.", "");
      } else if (action === "restart") {
        transcript.textContent = "";
        append(engine.restart().messages);
        Save.writeLocal(engine.state, true);
      } else if (action === "quit") {
        append([line("Your browser may prevent this page from closing itself. It is safe to close the tab or window now; your manual save remains intact.", "system")]);
        try { window.close(); } catch (error) { /* Browser-controlled behavior. */ }
      }
      updatePanels();
    }

    function runCommand(text) {
      var trimmed = text.trim();
      if (!trimmed) return;
      echoCommand(trimmed);
      history.push(trimmed);
      historyIndex = history.length;
      var outcome = engine.execute(trimmed);
      append(outcome.messages);
      if (outcome.changed) Save.writeLocal(engine.state, true);
      updatePanels();
      handleAction(outcome.action);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var command = input.value;
      input.value = "";
      runCommand(command);
      input.focus();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (historyIndex > 0) historyIndex -= 1;
        input.value = history[historyIndex] || "";
        input.setSelectionRange(input.value.length, input.value.length);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (historyIndex < history.length) historyIndex += 1;
        input.value = history[historyIndex] || "";
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    document.querySelectorAll("[data-command]").forEach(function (button) {
      button.addEventListener("click", function () {
        runCommand(button.getAttribute("data-command"));
        input.focus();
      });
    });

    modalCancel.addEventListener("click", closeModal);
    modalConfirm.addEventListener("click", function () {
      if (modalMode === "import") {
        var imported = Save.importPortable(modalInput.value);
        if (!imported.ok) {
          modalText.textContent = imported.error;
          modalText.classList.add("is-error");
          return;
        }
        modalText.classList.remove("is-error");
        closeModal();
        append(engine.restore(imported.state).messages);
        Save.writeLocal(engine.state, true);
        updatePanels();
      } else if (modalMode === "restart") {
        closeModal();
        transcript.textContent = "";
        append(engine.restart().messages);
        Save.writeLocal(engine.state, true);
        updatePanels();
      } else closeModal();
    });

    modalCopy.addEventListener("click", function () {
      modalInput.select();
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(modalInput.value).then(function () {
          modalText.textContent = "Portable save copied to the clipboard.";
        });
      } else {
        document.execCommand("copy");
        modalText.textContent = "Portable save copied to the clipboard.";
      }
    });

    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modalMode) closeModal();
      if (!modalMode && event.key.length === 1 && document.activeElement !== input) input.focus();
    });

    var effectsDisabled = false;
    try { effectsDisabled = localStorage.getItem("vault-of-ash-effects") === "off"; } catch (error) { effectsDisabled = false; }
    document.body.classList.toggle("effects-off", effectsDisabled);
    effectsToggle.checked = !effectsDisabled;
    effectsToggle.addEventListener("change", function () {
      document.body.classList.toggle("effects-off", !effectsToggle.checked);
      try { localStorage.setItem("vault-of-ash-effects", effectsToggle.checked ? "on" : "off"); } catch (error) { /* Preference remains session-only. */ }
      input.focus();
    });

    append(engine.begin().messages);
    updatePanels();
    Save.writeLocal(engine.state, true);
    input.focus();
  }

  var api = { Engine: Engine, bootBrowserGame: bootBrowserGame };
  root.VaultGame = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", bootBrowserGame);
})(typeof window !== "undefined" ? window : globalThis);
