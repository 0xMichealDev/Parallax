# Hosted v247

Deployed source: b5b0ea00dd2d6229aa9bc00953b0ffa67d0bcffc.

# Visible tracers, gun audio and 15-player rooms

Firing now immediately creates a bright, camera-facing tracer ribbon from the rifle muzzle, including offline and solo target practice. A warm glow surrounds the core; trails advance, fade and expire. Remote tracers are thicker too, and the shooter's server echo is suppressed to avoid duplicate trails. These cosmetic effects do not decide damage: shared combat remains server-authoritative.

Gun sound defaults on and has its own visible mute control, independent of camp ambience. A fire gesture unlocks Web Audio and plays an original synthesized report with a sharp transient, low body and fading tail. Nearby remote shots are attenuated and panned after audio has been unlocked. Audio closes on leaving the scene. No third-party recordings or paid assets were added.

The server and HUD now enforce/display 15 players per room. The existing per-address abuse limit remains unchanged. A bundled-server fixture accepted 15 distinct-address sessions, rejected the 16th, and reused a disconnected slot. This is capacity verification, not a sustained 15-device load test.

Validation: 29 automated tests passed (tracer geometry/lifetime, non-silent bounded audio waveform, audio unlock/mute, capacity, networking, rifle and camp controls). Two real WebSocket clients passed movement, combat, reload, death and respawn against the updated service. Its health response confirms capacity 15. Edge showed the new HUD/control, consumed ammunition, and captured a visible yellow tracer. Physical speaker output was not recorded or independently listened to. The preview initially hit the existing scene-load timeout; Retry loaded it successfully. Production build is required by the release workflow.

Private service change: room capacity is reduced from 16 to 15 with matching admission checks. Browser source and tests are exported; private service implementation is summarized only.
