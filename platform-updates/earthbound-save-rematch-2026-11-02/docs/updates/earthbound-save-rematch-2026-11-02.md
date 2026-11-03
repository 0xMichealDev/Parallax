# Earthbound loadout saving and rematch lobby

Weapon and outfit selections remain a draft until Save is pressed. The panel waits for the current player's server acknowledgement of both selections, then saves one browser preference record and returns to the lobby. A failed, disconnected or timed-out save stays visible for retry. Closing without saving preserves the previous saved choices. Browser storage failures are reported rather than claiming persistence.

Saved primary weapon and outfit restore on connection and on the next lobby. Existing legacy outfit preferences are retained as a migration fallback. Preferences are local to the browser; they are not account-wide cloud saves.

After a finished match, the results screen returns everyone to the lobby after five seconds. Health, reloads, shot cooldowns, movement allowance and ammunition reset. Cosmetic selections remain. The old match menu, aim and visual shot effects clear. Customization does not unexpectedly reopen over the next lobby; its button remains available. A new round requires two fresh ready votes. Existing match end and extraction rules remain unchanged.

Validation covers confirmed and partial acknowledgements, timeouts, connection changes, browser persistence, restoration, menu cleanup, a full round-to-lobby-to-rematch sequence, and existing weapon/combat rules. Visual in-game review remains outstanding. Private multiplayer deployment source stays private; the shared browser rules and tests are exported.

This release also closes a Free Roam vehicle handoff failure: a small entry/exit relocation has a separate, rate-limited allowance, and a delayed correction for driving cannot put an already exited player back inside the car. PvP movement limits are unchanged. The live service accepted entry, exit and the next walking step; actual compound geometry allowed driving and walking after exit.

Remote players use three authored skeletal combat poses, including supported elbows and a raised head when prone. Their equipped AR, sniper or sidearm is rendered at the hand attachment; defeated players no longer hold a weapon. Walking uses bounded cached lower-body motion; prone uses a small crawl cycle. Existing Meshy character and weapon assets are reused without new credits. These are improved existing characters, not a new photorealistic character scan. Weapon attachments do not yet follow remote aim pitch or show a separate remote reload animation.

Foot movement can enter the river and slows progressively to 35% of normal speed in deeper water. Feet follow the existing riverbed. Bridge walking remains normal and cars still avoid deep water. No drowning or survival meters were added.

The AR loadout card now uses the existing Blender render. Equipment previews distinguish helmets/hoods, vests/capes, and trouser colors. Four outfit entries are color styles; the fifth uses ghillie equipment. This is not fifteen independently modeled clothing pieces. The save confirmation covers all three appearance selections.

39 gameplay checks and three character/wading checks passed, plus the existing terrain and animation suites. Live two-client testing passed loadout/outfit acknowledgement, extraction, results, lobby reset and two new ready votes. Standing, crouching and prone weapon attachment was inspected in Blender. The in-app browser reported WebGL unavailable; actual browser 3D playtesting remains unverified. Compressed animation delivery preserves the original walk data exactly and keeps the package below the hosting limit.
