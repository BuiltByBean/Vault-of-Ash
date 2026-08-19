(function (root) {
  "use strict";

  var SAVE_VERSION = 1;
  var MAX_HEALTH = 10;
  var TRUE_NAME = "ilyra";

  var LORE = {
    founding_veyrholm: {
      title: "The Founding of Veyrholm",
      summary: "Veyrholm began as a mining settlement raised above warm, fertile ground, long before its people understood the source of that warmth."
    },
    ember_discovery: {
      title: "The Ember Below",
      summary: "Royal surveyors found a living heat beneath the city. Their earliest record describes curiosity and response—not an attack."
    },
    attempted_binding: {
      title: "The Binding Attempt",
      summary: "Veyrholm's rulers tried to draw the subterranean being into a vessel called the Cinderheart and turn its power toward war."
    },
    seven_day_fire: {
      title: "The Seven-Day Fire",
      summary: "The binding failed. Veyrholm burned for seven days, while survivors fled through ash-dark noon."
    },
    warden_formation: {
      title: "The Ashen Wardens",
      summary: "Survivors formed the Wardens to contain the wounded power below and protect the lands around the ruin."
    },
    vault_purpose: {
      title: "The Vault's First Purpose",
      summary: "The Vault was built around the Cinderheart as a barrier and refuge—not as a treasury."
    },
    warden_ideology: {
      title: "The Changing Order",
      summary: "Generations turned duty into doctrine. Later Wardens worshiped the prison itself and called captivity sacred."
    },
    serath_doubts: {
      title: "Keeper Serath's Doubt",
      summary: "The final Keeper believed containment once saved lives, but came to doubt that an ancient emergency justified endless imprisonment."
    },
    cinderheart_nature: {
      title: "A Mind in the Fire",
      summary: "Observatory instruments recorded patterns in the heat: grief, recognition, and deliberate answers to repeated signals."
    },
    true_name: {
      title: "A Name Before Cinderheart",
      summary: "Before the binding, the presence answered most clearly to a pattern the royal astronomer rendered as ILYRA."
    }
  };

  var SECRET_LORE = Object.keys(LORE);

  var ITEMS = {
    torch: {
      name: "torch",
      aliases: ["torch", "unlit torch"],
      description: "A pitch-wrapped torch, dry despite the damp. Once lit, it should hold a steady flame without fuel tracking.",
      consumable: false
    },
    bandage: {
      name: "bandage",
      aliases: ["bandage", "linen bandage", "linen"],
      description: "A sealed roll of clean linen. Using it restores up to 4 health.",
      consumable: true
    },
    ash_key: {
      name: "ash key",
      aliases: ["ash key", "key", "black key"],
      description: "A black iron key whose teeth resemble frozen tongues of flame.",
      consumable: false
    },
    rusted_sword: {
      name: "rusted sword",
      aliases: ["rusted sword", "sword", "old sword"],
      description: "A Warden sword damaged by time. A narrow groove in its guard could accept a small sigil.",
      consumable: false
    },
    crank_handle: {
      name: "crank handle",
      aliases: ["crank handle", "crank", "handle"],
      description: "A removable iron crank sized for a heavy geared mechanism.",
      consumable: false
    },
    oil_flask: {
      name: "oil flask",
      aliases: ["oil flask", "oil", "flask of oil"],
      description: "A stoppered flask of thick machine oil. There is enough for one substantial mechanism.",
      consumable: true
    },
    old_chain: {
      name: "old chain",
      aliases: ["old chain", "chain", "iron chain"],
      description: "A heavy iron chain, stained but sound. Its end links are made for a lift coupling.",
      consumable: false
    },
    ember_shard: {
      name: "ember shard",
      aliases: ["ember shard", "shard", "false relic"],
      description: "A warm splinter of black-red crystal. Its pulse is faint and seems to answer something far below.",
      consumable: false
    },
    warden_token: {
      name: "warden token",
      aliases: ["warden token", "token", "warden seal"],
      description: "A lead token stamped with an open hand above a closed flame. It identifies a sworn Keeper.",
      consumable: false
    },
    warden_cloak: {
      name: "warden cloak",
      aliases: ["warden cloak", "cloak", "old cloak"],
      description: "A dense, hooded cloak woven with mineral thread. By itself, it will not withstand the Furnace Gallery.",
      consumable: false
    },
    ash_resin: {
      name: "ash resin",
      aliases: ["ash resin", "resin", "black resin"],
      description: "A jar of fire-resistant resin once painted onto Warden garments. It remains pliable beneath its crust.",
      consumable: true
    },
    water_flask: {
      name: "water flask",
      aliases: ["water flask", "water", "flask of water"],
      description: "A small flask of mineral-tasting water. Useful for cooling burns, though not a substitute for proper protection.",
      consumable: true
    },
    ash_cloak: {
      name: "ash cloak",
      aliases: ["ash cloak", "treated cloak", "protective cloak"],
      description: "A Warden cloak sealed with ash resin. Its layered fabric turns fierce heat into a distant pressure.",
      consumable: false
    },
    chapel_sigil: {
      name: "chapel sigil",
      aliases: ["chapel sigil", "sigil", "iron sigil"],
      description: "A thumb-sized iron flame taken from the chapel reliquary. Its stem matches the groove in the rusted sword.",
      consumable: false
    },
    bone_tablet: {
      name: "bone tablet",
      aliases: ["bone tablet", "tablet", "ivory tablet"],
      description: "A pale tablet carved with the middle verse of an old Warden sequence: memory held between ash and fire.",
      consumable: false
    },
    ashen_blade: {
      name: "ashen blade",
      aliases: ["ashen blade", "blade", "restored sword"],
      description: "The chapel sigil has awakened a pale edge along the old sword. It was made to sever a binding at its living center.",
      consumable: false
    },
    cinderheart: {
      name: "Cinderheart",
      aliases: ["cinderheart", "heart", "true relic"],
      description: "Black stone folded around living fire. It is artifact, wound, prison, and perhaps person.",
      consumable: false
    }
  };

  function readable(name, aliases, text, lore) {
    return { name: name, aliases: aliases, text: text, lore: lore || [] };
  }

  function target(name, aliases, description) {
    return { name: name, aliases: aliases, description: description };
  }

  var ROOMS = {
    ruined_entrance: {
      name: "Ruined Entrance",
      act: "Act I — The Buried Threshold",
      baseDescription: "A stair of dark stone descends beneath the broken foundations of Veyrholm. Wind combs ash through the archway behind you.",
      firstVisit: "You came for a relic that has outlived a city. At the threshold, a dry torch rests in an old wall bracket. North, the stair disappears into the Vault.",
      repeatVisit: "Daylight remains visible through the ruined arch. The buried stair waits to the north.",
      exits: { north: "hall_of_dust" },
      items: ["torch"],
      targets: {
        archway: target("ruined archway", ["archway", "arch", "entrance"], "Beyond the arch lies open sky and the dead outline of Veyrholm. The way out remains clear—for now.")
      },
      readables: {
        marker: readable("weathered marker", ["marker", "stone marker"], "VEYRHOLM — RAISED WHERE WINTER YIELDS. The lower lines have been deliberately chiseled away.")
      }
    },

    hall_of_dust: {
      name: "Hall of Dust",
      act: "Act I — The Buried Threshold",
      baseDescription: "A broad hall divides around fallen columns. Dust lies deep enough to preserve every footstep, including yours.",
      firstVisit: "Three passages survive: a storeroom to the west, an armory to the east, and a scorched corridor to the north. A faded civic mural spans the inner wall.",
      repeatVisit: "Your tracks now cross the dust between the western, eastern, northern, and southern passages.",
      exits: { south: "ruined_entrance", west: "storeroom", east: "armory", north: "ember_passage" },
      items: [],
      targets: {
        tracks: target("tracks", ["tracks", "footsteps", "dust"], "Only your prints are fresh. Older trails end beneath the fallen ceiling, centuries out of date.")
      },
      readables: {
        mural: readable("civic mural", ["mural", "civic mural", "wall painting"], "Painted settlers raise Veyrholm above green fields while snow recedes from warm soil. No flame appears in the oldest panel.", ["founding_veyrholm"])
      }
    },

    storeroom: {
      name: "Storeroom",
      act: "Act I — The Buried Threshold",
      baseDescription: "Stone shelves line a low chamber that smells of cork, iron, and dust.",
      firstVisit: "Most provisions have spoiled, but a sealed bandage, two stoppered flasks, and a coiled length of chain remain serviceable.",
      repeatVisit: "Empty shelves surround the few supplies you have not taken. The Hall of Dust lies east.",
      exits: { east: "hall_of_dust" },
      items: ["bandage", "oil_flask", "water_flask", "old_chain"],
      targets: {
        shelves: target("stone shelves", ["shelves", "stone shelves", "supplies"], "Each shelf bears a symbol for cloth, water, oil, or hardware. The organization was practical, almost military.")
      },
      readables: {
        ledger: readable("supply ledger", ["ledger", "supply ledger"], "Final issue: lamp oil, surgical linen, lift chain, twelve water flasks. Destination: lower watch. The receiving signature is S. Serath.")
      }
    },

    armory: {
      name: "Armory",
      act: "Act I — The Buried Threshold",
      baseDescription: "Collapsed weapon racks lean against a wall striped with rust.",
      firstVisit: "One sword survives beneath a leather cover. Nearby sit a detachable crank and a black key tagged with a flake of gray wax.",
      repeatVisit: "The ruined racks offer little beyond anything you left behind. The Hall of Dust is west.",
      exits: { west: "hall_of_dust" },
      items: ["rusted_sword", "crank_handle", "ash_key"],
      targets: {
        racks: target("weapon racks", ["racks", "weapon racks", "weapons"], "The best arms were removed in an orderly fashion. The rusted sword was hidden rather than abandoned.")
      },
      readables: {
        issue_board: readable("issue board", ["issue board", "board", "armory record"], "NO EDGE IS TO BE CARRIED BELOW THE THIRD SEAL WITHOUT CHAPEL MARK. The warning has been underlined twice.")
      }
    },

    ember_passage: {
      name: "Ember Passage",
      act: "Act I — The Buried Threshold",
      baseDescription: "The corridor bends through lightless stone. Hairline cracks breathe hot dust across the floor.",
      firstVisit: "A sealed door stands at the northern end, its lock shaped like a fan of flame. Without a steady light, the glowing cracks are almost impossible to judge.",
      repeatVisit: "The hot cracks thread the floor around your remembered path. The Hall of Dust lies south.",
      exits: { south: "hall_of_dust", north: "false_reliquary" },
      items: [],
      targets: {
        sealed_door: target("sealed door", ["sealed door", "door", "northern door", "lock"], "The black lock is intact. Its keyway matches the flame-like teeth of an Ash Key."),
        cracks: target("ember cracks", ["cracks", "ember cracks", "floor"], "The cracks brighten and dim in irregular waves. A wrong step would mean scorched skin, but a lit torch would reveal the safe stone.")
      },
      readables: {}
    },

    false_reliquary: {
      name: "False Reliquary",
      act: "Act I — The Buried Threshold",
      baseDescription: "A small reliquary opens around a waist-high plinth. Gold leaf imitates fire across the ceiling, too decorative for the rooms above.",
      firstVisit: "A warm crystal shard rests in a shallow silver dish. Behind it, a severe Warden inscription cuts through the ornament.",
      repeatVisit: "The silver dish and carved warning remain. A narrow service opening leads west toward a broken lift.",
      exits: { south: "ember_passage", west: "broken_lift" },
      items: ["ember_shard"],
      targets: {
        plinth: target("reliquary plinth", ["plinth", "altar", "silver dish", "dish"], "The plinth was designed to make a fragment look like a treasure. Its rear edge points toward the service opening west.")
      },
      readables: {
        inscription: readable("Warden inscription", ["inscription", "warden inscription", "warning"], "What sleeps beneath is not the treasure. What sleeps beneath is the reason the treasure was buried.", ["vault_purpose"])
      }
    },

    broken_lift: {
      name: "Broken Lift",
      act: "Act I — The Buried Threshold",
      baseDescription: "An iron lift cage hangs over a black shaft. Its waist-high mechanism is incomplete but not destroyed.",
      firstVisit: "The crank socket is empty, the gear teeth are dry, and a snapped chain lies uselessly inside the housing. The False Reliquary is east.",
      repeatVisit: "The lift waits at the shaft, its condition reflecting the repairs you have made.",
      exits: { east: "false_reliquary", down: "lift_landing" },
      items: [],
      targets: {
        lift: target("lift mechanism", ["lift", "lift mechanism", "mechanism", "gears", "crank socket", "chain mount"], "Three faults are evident: the mechanism lacks a crank, its gears require oil, and the broken load chain must be replaced."),
        shaft: target("lift shaft", ["shaft", "black shaft"], "The shaft descends beyond the reach of your light. A cold draft rises from somewhere beneath the heat.")
      },
      readables: {
        maintenance_plate: readable("maintenance plate", ["maintenance plate", "plate", "lift plate"], "SERVICE ORDER: lubricate drive; seat hand crank; lock replacement chain before bearing weight.")
      }
    },

    lift_landing: {
      name: "Lift Landing",
      act: "Act II — The Ashen Wardens",
      baseDescription: "The repaired lift opens onto a landing supported by arches of black brick.",
      firstVisit: "The air is cooler here. A scribe's cell lies west, barracks east, and a memorial passage north. The Wardens built this level for people, not relics.",
      repeatVisit: "The repaired lift stands ready. Passages lead west, east, and north.",
      exits: { up: "broken_lift", west: "scribes_niche", east: "warden_barracks", north: "memorial_hall" },
      items: [],
      targets: {
        arches: target("black arches", ["arches", "black arches", "brickwork"], "Names are pressed into individual bricks—builders, cooks, guards, and children among them.")
      },
      readables: {}
    },

    scribes_niche: {
      name: "Scribe's Niche",
      act: "Act II — The Ashen Wardens",
      baseDescription: "A narrow desk and rows of stone pigeonholes fill this cramped chamber.",
      firstVisit: "A lead Warden token lies beside an oath register. North, shelves continue into the Ashen Library.",
      repeatVisit: "Dusty records surround the old desk. Exits lead north and east.",
      exits: { east: "lift_landing", north: "ashen_library" },
      items: ["warden_token"],
      targets: {
        desk: target("scribe's desk", ["desk", "scribe desk", "pigeonholes"], "Wax tablets record ordinary duties: water counts, watch changes, burial cloth, and arguments over bread.")
      },
      readables: {
        oath_register: readable("oath register", ["oath register", "register", "oath"], "We who survived take neither crown nor vengeance. We stand between the wounded fire and those who cannot endure it. We contain. We remember. We do not rule.", ["warden_formation"])
      }
    },

    ashen_library: {
      name: "Ashen Library",
      act: "Act II — The Ashen Wardens",
      baseDescription: "Stone shelves protect clay leaves and metal-bound books from damp and flame.",
      firstVisit: "The collection is divided by era. Early royal records use the language of discovery; later Warden volumes prefer sin, judgment, and sacred chains.",
      repeatVisit: "The contradictory record of Veyrholm waits on the shelves. The Scribe's Niche lies south.",
      exits: { south: "scribes_niche" },
      items: [],
      targets: {
        shelves: target("library shelves", ["shelves", "library", "books", "records"], "Labels identify a deep survey, a royal account, a fire chronicle, and a slim seal folio.")
      },
      readables: {
        deep_survey: readable("deep survey", ["deep survey", "survey", "mining survey"], "At depth forty-seven, the instruments warmed without flame. Three measured taps produced three answering pulses from below. No worker was harmed. The Crown has ordered silence until extraction can be assessed.", ["ember_discovery"]),
        royal_account: readable("royal account", ["royal account", "account", "binding account"], "The presence will be drawn into the prepared Cinderheart and made obedient. Objections from the surveyor are noted and overruled. Veyrholm requires a power no rival can answer.", ["attempted_binding"]),
        fire_chronicle: readable("fire chronicle", ["fire chronicle", "chronicle", "burned chronicle"], "The palace called the first eruption an enemy assault. A margin in another hand replies: The chains were already in it when it screamed.", ["seven_day_fire"]),
        seal_folio: readable("seal folio", ["seal folio", "folio", "seal clue"], "The first principle is written beneath a thumbprint of soot: What is burned speaks first.")
      }
    },

    charred_chapel: {
      name: "Charred Chapel",
      act: "Act II — The Ashen Wardens",
      baseDescription: "A chapel of fire-dark stone surrounds a cold bronze brazier.",
      firstVisit: "An iron chapel sigil rests in the brazier beside a sealed jar of ash resin. Layers of prayer have been carved over older, simpler vows.",
      repeatVisit: "The cold brazier and crowded walls remain. The Memorial Hall is west; the barracks are south.",
      exits: { west: "memorial_hall", south: "warden_barracks" },
      items: ["chapel_sigil", "ash_resin"],
      targets: {
        brazier: target("bronze brazier", ["brazier", "bronze brazier", "altar"], "A slot in the brazier once held the chapel sigil. Ash resin was kept here to treat ceremonial cloaks that passed near the lower furnace.")
      },
      readables: {
        litany: readable("late Warden litany", ["litany", "warden litany", "prayer"], "Blessed is the chain. Blessed is the wall. Blessed is the Keeper who asks no answer of the fire. The older vow beneath it speaks only of protection, not holiness.", ["warden_ideology"]),
        seal_homily: readable("seal homily", ["seal homily", "homily", "chapel clue"], "Only after ash and bone may the sacred fire awaken.")
      }
    },

    warden_barracks: {
      name: "Warden Barracks",
      act: "Act II — The Ashen Wardens",
      baseDescription: "Two rows of stone bunks face footlockers whose lids have warped open.",
      firstVisit: "A mineral-thread Warden cloak hangs from the least-damaged bunk. A personal letter has been tucked into its lining.",
      repeatVisit: "The stripped barracks connect north to the chapel and west to the lift landing.",
      exits: { west: "lift_landing", north: "charred_chapel" },
      items: ["warden_cloak"],
      targets: {
        bunks: target("stone bunks", ["bunks", "beds", "footlockers"], "The bunks are narrow, but each has a small niche for personal keepsakes. Most niches were emptied before the end.")
      },
      readables: {
        letter: readable("personal letter", ["letter", "personal letter", "barracks letter"], "Mother, the heat has been quiet for nine years. I still believe the first Keepers saved you. I no longer know why our children must inherit their sentence. Do not show this to the chapel reader.")
      }
    },

    memorial_hall: {
      name: "Memorial Hall",
      act: "Act II — The Ashen Wardens",
      baseDescription: "Names cover the walls from floor to ceiling, cut at different depths by different generations.",
      firstVisit: "A memorial roll hangs beneath seven bronze bands. North, the air shimmers at the mouth of a furnace passage. The chapel lies east.",
      repeatVisit: "The dead keep their crowded watch. Passages lead south, east, and north.",
      exits: { south: "lift_landing", east: "charred_chapel", north: "furnace_gallery" },
      items: [],
      targets: {
        names: target("memorial names", ["names", "walls", "memorial"], "The earliest names include royal servants and miners. Later additions honor Wardens who died reinforcing the containment works.")
      },
      readables: {
        memorial_roll: readable("memorial roll", ["memorial roll", "roll", "list of dead"], "DAY ONE: palace quarter lost. DAY THREE: river boiled at the south bridge. DAY SEVEN: rain reached the outer fields and the fire withdrew below. The roll names both those killed by the first binding and those who later died containing it.", ["seven_day_fire"])
      }
    },

    furnace_gallery: {
      name: "Furnace Gallery",
      act: "Act II — The Ashen Wardens",
      baseDescription: "A long gallery crosses above vents glowing dull orange. Heat bends the far arch into a wavering shape.",
      firstVisit: "Even at the threshold, exposed skin tightens. The crossing north is survivable only with the protection the Wardens once wore.",
      repeatVisit: "The furnace vents continue their slow exhalation between the memorial south and the Hall of Three north.",
      exits: { south: "memorial_hall", north: "hall_of_three" },
      items: [],
      targets: {
        vents: target("furnace vents", ["vents", "furnace", "gallery", "heat"], "The vents open in a timed pattern, but no route avoids their heat. A resin-treated mineral cloak would insulate the crossing.")
      },
      readables: {
        safety_mark: readable("safety mark", ["safety mark", "mark", "furnace instructions"], "LOWER CROSSING: ASH-TREATED CLOAK REQUIRED. Water cools injury; it does not make passage safe.")
      }
    },

    hall_of_three: {
      name: "Hall of Three",
      act: "Act III — The Three Seals",
      baseDescription: "Three pillars rise beneath a fractured dome: one blackened, one pale, one veined with red glass.",
      firstVisit: "Reliefs point west toward an ash garden, east toward a Keeper's tomb, and north toward the sealed inner approach. The furnace lies south.",
      repeatVisit: "Ash, bone, and flame watch the four passages from their pillars.",
      exits: { south: "furnace_gallery", west: "ash_garden", east: "keepers_tomb", north: "seal_antechamber" },
      items: [],
      targets: {
        pillars: target("three pillars", ["pillars", "three pillars", "reliefs"], "The pillars represent ash, bone, and flame. Their circular arrangement provides no obvious beginning.")
      },
      readables: {}
    },

    ash_garden: {
      name: "Ash Garden",
      act: "Act III — The Three Seals",
      baseDescription: "Stone channels divide beds of fine gray ash. White mineral stems imitate plants that once grew here.",
      firstVisit: "The garden was tended long after sunlight vanished. A narrow stair climbs north toward the cracked observatory.",
      repeatVisit: "The mineral garden holds its permanent season. Exits lead east and north.",
      exits: { east: "hall_of_three", north: "cracked_observatory" },
      items: [],
      targets: {
        plants: target("mineral plants", ["plants", "garden", "stems", "ash beds"], "Each stem formed where warm mineral water once dripped through ash. The Wardens cultivated beauty beside the prison they guarded.")
      },
      readables: {
        gardener_slate: readable("gardener's slate", ["gardener slate", "gardener's slate", "slate"], "Keeper Serath asks whether roots seek light or merely room to grow. I told him a gardener cannot answer for a root kept in a pot.")
      }
    },

    keepers_tomb: {
      name: "Keeper's Tomb",
      act: "Act III — The Three Seals",
      baseDescription: "A line of plain sarcophagi ends at an empty recess prepared for one final Keeper.",
      firstVisit: "A bone tablet rests on the empty bier. The carved epitaph speaks of memory standing between what fire leaves and what fire becomes.",
      repeatVisit: "The empty final recess remains more unsettling than the occupied tombs. The Hall of Three lies west.",
      exits: { west: "hall_of_three" },
      items: ["bone_tablet"],
      targets: {
        sarcophagi: target("sarcophagi", ["sarcophagi", "tombs", "bier", "empty recess"], "The first tombs bear names; the later ones bear only numbers and titles. Serath's prepared place was never used.")
      },
      readables: {
        epitaph: readable("Keeper's epitaph", ["epitaph", "keeper epitaph", "tomb clue"], "The dead stand between memory and flame."),
        tablet_text: readable("bone tablet", ["bone tablet", "tablet", "tablet text"], "BONE IS NOT DEATH ALONE. IT IS THE SHAPE MEMORY KEEPS WHEN HEAT HAS PASSED.", ["attempted_binding"])
      }
    },

    cracked_observatory: {
      name: "Cracked Observatory",
      act: "Act III — The Three Seals",
      baseDescription: "A brass instrument points through a crack in the stone ceiling toward a thin blade of sky.",
      firstVisit: "Heat charts cover one table; a star-and-sound record lies weighted beneath a lens. The Ash Garden is south.",
      repeatVisit: "The patient instruments remain aimed at both the sky above and the fire below.",
      exits: { south: "ash_garden" },
      items: [],
      targets: {
        instrument: target("brass instrument", ["instrument", "telescope", "brass instrument", "lens"], "The device compares pulses from the earth with stellar cycles. Several needles were adapted to record pauses and repetitions.")
      },
      readables: {
        observatory_record: readable("observatory record", ["observatory record", "heat charts", "charts", "record"], "The lower heat does not vary randomly. When addressed, it repeats old intervals and changes them after correction. Serath calls this mimicry. I call it attention. The final pattern resembles grief more than hunger.", ["cinderheart_nature"]),
        name_chart: readable("star-and-sound chart", ["name chart", "star chart", "star-and-sound chart", "sound chart"], "The royal astronomer marked one answering interval again and again: IL-Y-RA. Beside it: Not our name for the vessel. Its answer before the vessel. ILYRA.", ["true_name"])
      }
    },

    seal_antechamber: {
      name: "Seal Antechamber",
      act: "Act III — The Three Seals",
      baseDescription: "Concentric channels cover the floor, carrying old soot toward a door farther north.",
      firstVisit: "A binding diagram shows three symbols feeding a central lock. The Hall of Three remains south.",
      repeatVisit: "The channels converge beneath the northern Three-Seal Door.",
      exits: { south: "hall_of_three", north: "three_seal_door" },
      items: [],
      targets: {
        diagram: target("binding diagram", ["diagram", "binding diagram", "floor", "channels"], "Three channels are labeled ASH, BONE, and FLAME. The mechanism expects all three in an intentional order.")
      },
      readables: {
        diagram_note: readable("diagram notation", ["diagram notation", "notation", "binding note"], "The first binding forced the living fire into a royal vessel. The later seals were built to contain both vessel and wound.", ["attempted_binding"])
      }
    },

    three_seal_door: {
      name: "Three-Seal Door",
      act: "Act III — The Three Seals",
      baseDescription: "A circular door fills the passage. Three stone seals—ASH, BONE, and FLAME—turn around a dark center.",
      firstVisit: "The seals can be set from here. Their sequence was divided among Warden teachings so that no single careless reader held the answer.",
      repeatVisit: "The circular door waits between the antechamber south and the Inner Vault north.",
      exits: { south: "seal_antechamber", north: "inner_sanctum" },
      items: [],
      targets: {
        seals: target("three seals", ["seals", "three seals", "door", "three-seal door"], "The symbols can be entered with: SET SEAL [symbol] [symbol] [symbol]. Incorrect sequences reset rather than jam.")
      },
      readables: {}
    },

    inner_sanctum: {
      name: "Inner Sanctum",
      act: "Act IV — The Heart Below",
      baseDescription: "The masonry changes here. Ancient fitted stone gives way to glassy rock that seems to have cooled in place.",
      firstVisit: "An original Warden charter hangs beneath a cracked seal. A narrow vigil chamber lies east; the path to the Cinder Vault continues north.",
      repeatVisit: "The first charter watches over the passages east, north, and south.",
      exits: { south: "three_seal_door", east: "keepers_vigil", north: "cinder_vault" },
      items: [],
      targets: {
        masonry: target("glassy masonry", ["masonry", "stone", "glassy rock"], "Part of this chamber was carved. Part of it was melted and allowed to become a wall.")
      },
      readables: {
        charter: readable("original Warden charter", ["charter", "original charter", "warden charter"], "Containment shall last while release threatens the living. No throne, temple, or family shall own the fire. Each Keeper must preserve the record of our fault as faithfully as the record of its danger.", ["vault_purpose", "warden_formation"])
      }
    },

    keepers_vigil: {
      name: "Keeper's Vigil",
      act: "Act IV — The Heart Below",
      baseDescription: "A cot, writing shelf, and cold kettle occupy the final Keeper's living cell.",
      firstVisit: "Serath's journal remains open. The entries span decades, from disciplined certainty to an unanswered final question.",
      repeatVisit: "The quiet cell preserves the long argument Serath conducted with the order and with himself.",
      exits: { west: "inner_sanctum" },
      items: [],
      targets: {
        cell: target("Keeper's cell", ["cell", "cot", "kettle", "writing shelf"], "Nothing here suggests authority or comfort. The final Keeper lived like a watchman who expected no relief.")
      },
      readables: {
        serath_journal: readable("Serath's journal", ["journal", "serath journal", "serath's journal", "keeper journal"], "Year 3: The order is a wall against ruin. I am proud to bear its weight.\n\nYear 19: The royal account is true. Veyrholm struck first. That does not make the Seven-Day Fire less terrible.\n\nYear 31: A cage built during a flood may save every life in reach. Must it remain locked when the waters withdraw? I will not command the next Keeper. I will leave them the truth.", ["serath_doubts"])
      }
    },

    cinder_vault: {
      name: "Cinder Vault",
      act: "Act IV — The Heart Below",
      baseDescription: "Massive black bands cross the walls and vanish into the chamber ahead. Each band trembles at a different rhythm.",
      firstVisit: "A final binding record has been bolted to the floor. Beyond it, a low opening leads north into warm darkness.",
      repeatVisit: "The bands carry a slow pulse between the sanctum south and the chamber north.",
      exits: { south: "inner_sanctum", north: "true_relic_chamber" },
      items: [],
      targets: {
        bands: target("binding bands", ["bands", "binding bands", "chains", "black bands"], "These are not simple restraints. They draw excess heat away from the vessel and into the furnace works above. Breaking them would affect the whole Vault.")
      },
      readables: {
        binding_record: readable("final binding record", ["binding record", "final record", "record"], "Containment stopped the spreading fire after Veyrholm fell. Later tests suggest the vessel stabilized caverns far beneath the city as well. Release, destruction, and renewal of the bond each carry consequences we cannot measure.", ["attempted_binding", "cinderheart_nature"])
      }
    },

    true_relic_chamber: {
      name: "True Relic Chamber",
      act: "Act IV — The Heart Below",
      baseDescription: "The chamber is warm. Not hot. Warm. A black stone rests within an open lattice above a shallow altar.",
      firstVisit: "For the first time since entering the Vault, you hear something that is not stone, wind, or fire. A heartbeat. Once. Then again. The stone unfolds along a red seam, not like a lid, but like an eye learning light. One thought reaches you in fragments: TAKEN. KEPT. AFRAID.",
      repeatVisit: "The Cinderheart watches without a face. Its sparse pulse travels through the chamber and your Ember Shard, if you carry it.",
      exits: { south: "cinder_vault", west: "escape_tunnel" },
      items: [],
      targets: {
        cinderheart: target("Cinderheart", ["cinderheart", "heart", "true relic", "black stone"], "It is smaller than the legends and more present than any object should be. You may TAKE, BIND, FREE, or DESTROY it—if you possess what each act requires."),
        altar: target("shallow altar", ["altar", "lattice", "open lattice"], "The lattice can open outward or close inward. The design permits a choice; the Wardens did not remove it.")
      },
      readables: {}
    },

    escape_tunnel: {
      name: "Escape Tunnel",
      act: "Act IV — The Heart Below",
      baseDescription: "A steep tunnel climbs westward until a deliberate collapse blocks the old surface exit.",
      firstVisit: "Serath prepared this route, then sealed it from within. A final line is scratched into the support stone.",
      repeatVisit: "The blocked tunnel offers no escape while the Cinderheart remains bound. The true chamber is east.",
      exits: { east: "true_relic_chamber" },
      items: [],
      targets: {
        collapse: target("collapsed exit", ["collapse", "collapsed exit", "exit", "rubble"], "The rubble is stable and far too deep to clear by hand. The tunnel may reopen only if the Vault itself moves.")
      },
      readables: {
        final_line: readable("Serath's final line", ["final line", "scratch", "scratched line"], "I leave a road, not an instruction. Whoever comes after me must be allowed to choose with the truth I was denied.", ["serath_doubts"])
      }
    }
  };

  function createInitialState() {
    var roomItems = {};
    Object.keys(ROOMS).forEach(function (roomId) {
      roomItems[roomId] = ROOMS[roomId].items.slice();
    });

    return {
      saveVersion: SAVE_VERSION,
      currentRoom: "ruined_entrance",
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      inventory: [],
      roomItems: roomItems,
      visitedRooms: [],
      lore: [],
      puzzles: {
        sealedDoorUnlocked: false,
        lift: { crankInstalled: false, mechanismOiled: false, chainInstalled: false, repaired: false },
        ashCloakMade: false,
        sealsSolved: false,
        sealAttempts: 0,
        bladeForged: false
      },
      hints: { sealedDoor: 0, lift: 0, furnace: 0, seals: 0, finale: 0, general: 0 },
      flags: { torchLit: false, emberPassageEntries: 0, furnaceEntries: 0, chamberAwake: false },
      gameOver: false,
      ending: null,
      turnCount: 0
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  var api = {
    SAVE_VERSION: SAVE_VERSION,
    MAX_HEALTH: MAX_HEALTH,
    TRUE_NAME: TRUE_NAME,
    LORE: LORE,
    SECRET_LORE: SECRET_LORE,
    ITEMS: ITEMS,
    ROOMS: ROOMS,
    createInitialState: createInitialState,
    clone: clone
  };

  root.VaultWorld = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
