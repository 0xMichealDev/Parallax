# Earthbound expedition rifle and solo target practice

Replaces the held flashlight mesh with an original Blender-authored, textured rifle game prop. Adds X / Fire, R reload, Aim, Q stow, visible ammunition, reload progress, recoil and optional shot audio. Scanner moves to V. The existing light toggle remains available as utility lighting.

Target range moves the player to three practice targets; hits and bullseyes score locally. Mouse-look mode supports left-click fire; ordinary view dragging does not fire. Controls pause behind camp/map panels, while stowed, in vehicles and during flight. Hidden tabs do not advance reload. Sound stays opt-in and reduced motion suppresses recoil/reload motion and flash.

The 1.29 MB original asset contains 14,300 triangles and three embedded 512px PBR maps. No Meshy credits used. No multiplayer, player damage, persistence or network combat authority is claimed. Future PvP needs authoritative server validation, player synchronization and matchmaking; the local command/state split is only an initial boundary.

Validation: ammunition/rate/reload/scoring tests, target occlusion checks, asset parser/budget checks, walking terrain checks, camp/menu/input regression tests, Earthbound entry lifecycle tests and production build. Edge visual checks confirmed the textured model, HUD, target scoring, aiming alignment and empty-magazine reload from 0/90 to 30/60. The range was moved clear of the parked rover. Keyboard commands have automated input tests; the native browser automation did not reliably deliver the X shortcut, so keyboard visual verification is not claimed.
