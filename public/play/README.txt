VAULT OF ASH
Phase 1 — Complete Text Adventure
Version 1.0.0


ABOUT THE GAME

Centuries after the city of Veyrholm burned, its buried vault has cracked open.
You enter as a relic hunter seeking the legendary treasure said to remain below.

Vault of Ash is a complete, keyboard-first text adventure about exploration,
forgotten history, environmental danger, and difficult choices. A first playthrough
usually takes between 90 minutes and 3 hours, depending on puzzle solving and how
thoroughly you explore.

The game is completely offline. It contains no advertisements, accounts, tracking,
network requests, or external downloads.


HOW TO LAUNCH

Windows

1. Open the VAULT_OF_ASH folder.
2. Double-click index.html.
3. If Windows asks which program to use, choose Chrome, Edge, or Firefox.

macOS

1. Open the VAULT_OF_ASH folder in Finder.
2. Double-click index.html.
3. If it opens in an editor, Control-click index.html, choose Open With, and select
   Safari, Chrome, or Firefox.

Linux

1. Open the VAULT_OF_ASH folder in your file manager.
2. Double-click index.html and choose a web browser if asked.
3. Alternatively, right-click index.html and choose Open With, then select Firefox,
   Chrome, Chromium, or another modern browser.

No installation, internet connection, web server, or administrator permission is
required. Use a current desktop version of Chrome, Edge, Firefox, or Safari.


HOW TO PLAY

Type a command into the prompt at the bottom of the game and press Enter.

Use the Up Arrow and Down Arrow keys to revisit commands you entered earlier.
The prompt automatically regains focus during ordinary play.

Useful commands:

  help
  look
  inspect torch
  read inscription
  north
  go west
  take torch
  use torch
  use ash key on sealed door
  combine cloak with resin
  inventory
  status
  lore
  hint

Commands are not case-sensitive. Extra spaces are ignored, and articles such as
"the" are accepted in normal phrases.

The five quick-command buttons beneath the transcript provide easy access to LOOK,
INVENTORY, LORE, HINT, and HELP. They are optional; the whole game can be played
from the keyboard.


EXPLORATION AND PUZZLES

Use LOOK whenever you need to review a room's visible objects and exits.

INSPECT or LOOK AT an object to learn what it is. READ written objects to uncover
clues and record important discoveries. The LORE command reviews only the major
information you have already found.

If you become stuck, use HINT. Important puzzles provide three escalating hint
levels. Hints never change the puzzle or penalize the player.

Required items cannot be dropped. Incorrect puzzle attempts do not permanently
jam mechanisms or make the game impossible to finish.


HEALTH

Maximum health is 10. Environmental hazards clearly report damage and current
health. A bandage can restore health but cannot raise it above the maximum.

At 0 health, the game ends and offers RESTART, LOAD, or QUIT. Your manual save is
not erased.


SAVING AND LOADING

The game keeps an automatic recovery save in your browser as you make progress.

Use:

  save

to create a manual save in the current browser.

Use:

  load

to restore the manual save. If no manual save exists, the game tries the automatic
recovery save.

Browser saves belong to that browser profile on that computer. Private browsing,
clearing site data, security software, or moving to another computer can make those
saves unavailable.


PORTABLE USB SAVES

Use:

  export save

The game displays a long text string beginning with VOA1:. Copy the entire string
into an ordinary text file on your USB drive.

To restore it later, launch the game and use:

  import save

Paste the complete string into the import window and choose Import. The game checks
the data before applying it and never executes imported text as code.


RESTARTING AND QUITTING

Use RESTART to begin again from the original entrance. You will be asked to confirm
because current progress will be reset. An existing manual save remains available.

Use QUIT when you are finished. Browsers often prevent offline pages from closing
their own tabs, so the game may simply tell you it is safe to close the window.


ACCESSIBILITY AND DISPLAY

The game uses high-contrast colors, keyboard controls, semantic labels, and a live
text transcript. The Atmosphere checkbox at the top disables optional visual motion.
The game also honors the operating system's reduced-motion preference.

You can use the browser's normal zoom controls if larger text is helpful:

  Windows/Linux: Ctrl and +
  macOS: Command and +


TROUBLESHOOTING

The page appears as plain text or the game does not start

- Confirm that the css and js folders are beside index.html.
- Do not move index.html out of the VAULT_OF_ASH folder by itself.
- Extract the complete ZIP archive before playing; do not run the page from inside
  a compressed-file preview.
- Try opening index.html with a different current browser.
- Make sure JavaScript is enabled for local files.

SAVE or LOAD does not work

- Your browser may be blocking storage for local files.
- Use EXPORT SAVE to create a portable backup instead.
- Do not rely on saves made in a private/incognito window.

The wrong command keeps appearing

- Press Down Arrow until the prompt is blank, or select the prompt and type a new
  command.

The game does not understand a command

- Type HELP for the supported command forms.
- Use LOOK to review visible objects.
- Try INSPECT followed by the exact object name shown in the room.
- The parser accepts many aliases but does not attempt open-ended natural language.

The transcript is moving or glowing too much

- Turn off the Atmosphere checkbox at the top of the game.

The USB drive is read-only

- The game itself can still run.
- Browser saves are stored by the browser, not written into the game folder.
- For a portable save, export the string and save it somewhere writable, then copy
  it to the USB later.


COPYING TO A USB DRIVE

Copy the entire VAULT_OF_ASH folder, including index.html, README.txt,
CHANGELOG.txt, css, and js. Keep the folder structure unchanged.

The tests folder and DEVELOPER_WALKTHROUGH.txt are not needed for play, but keeping
them with the project is useful if you want to study or modify the source later.


Vault of Ash requires only a reasonably current desktop browser. As with any browser
game, very old browsers, locked-down corporate policies, or browser settings that
disable JavaScript or local storage may limit some features.
