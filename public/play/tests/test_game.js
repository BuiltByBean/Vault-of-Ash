"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const World = require("../js/world.js");
const Parser = require("../js/parser.js");
const Save = require("../js/save.js");
const { Engine } = require("../js/game.js");

let assertions = 0;
function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function command(engine, text) {
  const outcome = engine.execute(text);
  check(Array.isArray(outcome.messages), `Command returned messages: ${text}`);
  return outcome;
}

function run(engine, commands) {
  commands.forEach((text) => {
    command(engine, text);
    if (engine.state.gameOver && engine.state.ending === "death") {
      throw new Error(`Unexpected death after command: ${text}`);
    }
  });
}

const commonWalkthrough = [
  "take torch",
  "use torch",
  "north",
  "read mural",
  "west",
  "take bandage",
  "take oil flask",
  "take water flask",
  "take old chain",
  "east",
  "east",
  "take rusted sword",
  "take crank handle",
  "take ash key",
  "west",
  "north",
  "use the ash key on the sealed door",
  "north",
  "read warden inscription",
  "take ember shard",
  "west",
  "use old chain on lift",
  "use oil flask on mechanism",
  "use crank handle on lift mechanism",
  "down",
  "west",
  "take warden token",
  "read oath register",
  "north",
  "read deep survey",
  "read royal account",
  "read fire chronicle",
  "read seal folio",
  "south",
  "east",
  "east",
  "take warden cloak",
  "read personal letter",
  "north",
  "take chapel sigil",
  "take ash resin",
  "read late warden litany",
  "read seal homily",
  "combine warden cloak with ash resin",
  "combine rusted sword with chapel sigil",
  "west",
  "read memorial roll",
  "north",
  "north",
  "west",
  "read gardener slate",
  "north",
  "read observatory record",
  "read name chart",
  "south",
  "east",
  "east",
  "take bone tablet",
  "read keeper epitaph",
  "read bone tablet",
  "west",
  "north",
  "read diagram notation",
  "north",
  "set seal flame bone ash",
  "set seal ash bone flame",
  "north",
  "read original charter",
  "east",
  "read serath journal",
  "west",
  "north",
  "read final binding record",
  "north",
  "west",
  "read final line",
  "east"
];

function buildFinalEngine() {
  const engine = new Engine();
  engine.begin();
  run(engine, commonWalkthrough);
  check(engine.state.currentRoom === "true_relic_chamber", "Walkthrough reaches the True Relic Chamber");
  check(engine.state.health === 10, "Protected walkthrough takes no damage");
  check(engine.state.lore.length === Object.keys(World.LORE).length, "Walkthrough discovers all major lore");
  return engine;
}

// 1. New game and complete content inventory.
const fresh = new Engine();
fresh.begin();
check(fresh.state.currentRoom === "ruined_entrance", "New game starts at Ruined Entrance");
check(fresh.state.health === 10, "New game starts at full health");
check(Object.keys(World.ROOMS).length === 25, "All 25 unique rooms exist");
[
  "torch", "bandage", "ash_key", "rusted_sword", "crank_handle", "oil_flask", "old_chain",
  "ember_shard", "warden_token", "warden_cloak", "ash_resin", "water_flask", "ash_cloak",
  "chapel_sigil", "bone_tablet", "ashen_blade", "cinderheart"
].forEach((id) => check(Boolean(World.ITEMS[id]), `Required item exists: ${id}`));

// 2. Parser aliases and useful incomplete messages.
check(Parser.parse("  Go   NORTH ").direction === "north", "Parser trims repeated whitespace");
check(Parser.parse("i").verb === "inventory", "Inventory alias works");
check(Parser.parse("get the torch").object === "torch", "Take alias and article removal work");
check(Parser.parse("use ash key on").message === "Use the ash key on what?", "Incomplete use command is helpful");
check(Parser.parse("take").message === "Take what?", "Incomplete take command is helpful");

// 3. Early hazard, torch, and key.
const early = new Engine();
early.begin();
run(early, ["north", "north"]);
check(early.state.health === 8, "Ember Passage damages an unprotected player");
run(early, ["south", "south", "take torch", "use torch", "north", "north"]);
check(early.state.health === 8, "Lit torch prevents further Ember Passage damage");
run(early, ["south", "east", "take ash key", "west", "north"]);
command(early, "north");
check(early.state.currentRoom === "ember_passage", "Sealed door blocks progress before unlocking");
command(early, "use ash key on sealed door");
command(early, "north");
check(early.state.currentRoom === "false_reliquary", "Ash Key unlocks the False Reliquary door");

// 4. Lift stages and preservation.
const lift = new Engine();
lift.begin();
run(lift, ["take torch", "use torch", "north", "west", "take oil flask", "take old chain", "east", "east", "take crank handle", "take ash key", "west", "north", "use ash key on sealed door", "north", "west"]);
command(lift, "down");
check(lift.state.currentRoom === "broken_lift", "Lift does not activate early");
command(lift, "use crank handle on lift");
check(lift.state.puzzles.lift.crankInstalled && !lift.state.puzzles.lift.repaired, "Lift tracks crank separately");
command(lift, "use oil flask on lift mechanism");
check(lift.state.puzzles.lift.mechanismOiled && !lift.state.puzzles.lift.repaired, "Lift tracks oil separately");
command(lift, "use old chain on mechanism");
check(lift.state.puzzles.lift.repaired, "Lift repairs when all three parts are installed");
command(lift, "use old chain on mechanism");
check(lift.state.puzzles.lift.repaired, "Repeating installed lift action cannot undo repair");
command(lift, "down");
check(lift.state.currentRoom === "lift_landing", "Repaired lift unlocks downward progression");

// 5. Cloak and Furnace Gallery.
const furnace = new Engine();
furnace.state.currentRoom = "memorial_hall";
command(furnace, "north");
check(furnace.state.health === 7, "Furnace Gallery damages an unprotected player without killing at full health");
command(furnace, "north");
check(furnace.state.currentRoom === "furnace_gallery" && furnace.state.health === 5, "Unprotected crossing is blocked and causes clear damage");
const cloak = new Engine();
cloak.state.inventory = ["warden_cloak", "ash_resin"];
command(cloak, "combine warden cloak with ash resin");
check(cloak.hasItem("ash_cloak") && !cloak.hasItem("warden_cloak") && !cloak.hasItem("ash_resin"), "Ash Cloak is created from required ingredients");
cloak.state.currentRoom = "memorial_hall";
command(cloak, "north");
command(cloak, "north");
check(cloak.state.currentRoom === "hall_of_three" && cloak.state.health === 10, "Ash Cloak protects the Furnace crossing");

// 6. Three seals.
const seals = new Engine();
seals.state.currentRoom = "three_seal_door";
command(seals, "set seal bone ash flame");
check(!seals.state.puzzles.sealsSolved, "Wrong seal sequence is rejected without a soft lock");
command(seals, "set seal ash bone flame");
check(seals.state.puzzles.sealsSolved, "Correct seal sequence permanently opens progression");
command(seals, "north");
check(seals.state.currentRoom === "inner_sanctum", "Solved seals unlock the Inner Vault");

// 7. All endings.
const thief = buildFinalEngine();
command(thief, "take cinderheart");
check(thief.state.ending === "thief", "THE THIEF ending is reachable");

const warden = buildFinalEngine();
command(warden, "bind cinderheart");
check(warden.state.ending === "warden", "THE WARDEN ending is reachable");

const ash = buildFinalEngine();
command(ash, "destroy cinderheart");
check(ash.state.ending === "ash", "THE ASH ending is reachable");

const ember = buildFinalEngine();
command(ember, "free cinderheart");
check(ember.state.ending === "ember", "THE EMBER ending is reachable");

const named = buildFinalEngine();
command(named, "speak ilyra");
check(named.state.ending === "name", "THE NAME secret ending is reachable with all prerequisites");

const prematureName = new Engine();
prematureName.state.currentRoom = "true_relic_chamber";
prematureName.state.inventory = ["ember_shard"];
command(prematureName, "speak ilyra");
check(!prematureName.state.gameOver, "Secret ending is unavailable without the required lore");

const blockedWarden = new Engine();
blockedWarden.state.currentRoom = "true_relic_chamber";
command(blockedWarden, "bind cinderheart");
check(!blockedWarden.state.gameOver, "Warden ending enforces item and lore prerequisites");

// 8. Save, export/import, restart, lore persistence, and death.
const savedEngine = buildFinalEngine();
const serialized = Save.serialize(savedEngine.state);
const restored = Save.deserialize(serialized);
check(restored.ok && restored.state.currentRoom === "true_relic_chamber", "Save/load preserves location");
check(restored.state.lore.length === savedEngine.state.lore.length, "Save/load preserves lore");
check(restored.state.puzzles.sealsSolved, "Save/load preserves puzzle state");
const portable = Save.exportPortable(savedEngine.state);
const imported = Save.importPortable(portable);
check(imported.ok && imported.state.inventory.includes("ember_shard"), "Export/import preserves complete inventory state");
check(!Save.importPortable("VOA1:not-valid").ok, "Corrupted portable save is rejected gracefully");
const tamperedState = World.clone(savedEngine.state);
tamperedState.roomItems.ruined_entrance.push("not_a_real_item");
check(!Save.deserialize(Save.serialize(tamperedState)).ok, "Imported saves reject unknown room items");
savedEngine.restart();
check(savedEngine.state.currentRoom === "ruined_entrance" && savedEngine.state.inventory.length === 0, "Restart fully resets world and inventory");
check(savedEngine.state.lore.length === 0 && !savedEngine.state.puzzles.sealsSolved, "Restart fully resets lore and puzzles");
const doomed = new Engine();
const deathMessages = doomed.damage(10, "Test hazard.");
check(doomed.state.gameOver && doomed.state.ending === "death", "Death occurs exactly at zero health");
check(deathMessages.some((message) => message.text.includes("RESTART")), "Death offers restart, load, and quit");

// 9. Static offline assumptions.
const projectRoot = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
check(!/https?:\/\//i.test(html), "index.html contains no network URL dependencies");
check(!/type=["']module["']/i.test(html), "index.html avoids ES module file:// restrictions");
["css/style.css", "js/world.js", "js/parser.js", "js/puzzles.js", "js/save.js", "js/game.js"].forEach((relative) => {
  check(fs.existsSync(path.join(projectRoot, relative)), `Required offline file exists: ${relative}`);
});
for (const file of ["index.html", "css/style.css", "js/world.js", "js/parser.js", "js/puzzles.js", "js/save.js", "js/game.js"]) {
  const contents = fs.readFileSync(path.join(projectRoot, file), "utf8");
  check(!/(fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|import\s*\()/i.test(contents), `No runtime network request pattern in ${file}`);
}

console.log(`Vault of Ash automated tests passed (${assertions} assertions).`);
