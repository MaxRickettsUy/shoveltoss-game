📋 Shovel Toss — Plan List
🥇 Core MVP Plans (build in this order)

throw-system.md
Timing meter (Madden/Retro Bowl style)
Power calculation
Launch angle + velocity
Projectile arc behavior
Trigger for scoring evaluation

game-loop.md
Main update/render loop (requestAnimationFrame)
Game state flow (idle → throwing → result → reset)
Restart logic for runs

scoring-system.md
Pit hit detection rules
Point values (base + accuracy bonus)
Combo/multiplier logic
Run score reset rules
🟡 Secondary MVP+ Plans (add after core works)

ui-system.md
Score display
Throw meter rendering
Start / restart screen
Minimal HUD layout

difficulty-scaling.md
Speed/timing progression over time
Increased precision demands
Optional distance scaling
Run-based difficulty ramp

🧩 Optional / Only if complexity grows

state-model.md
Game state structure (single source of truth)
Throw state machine (idle → charging → release → resolving)
Score/run state management