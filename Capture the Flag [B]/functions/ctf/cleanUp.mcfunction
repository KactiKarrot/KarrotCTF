# start 15 second countdown until tp out of arena
# event entity @e[name=counter, type=karrot:dummy] karrot:start15sTimer
# Above line commented out until the dummy entity is made as the nonexistent event gives an error is vscode
# ability @a[tag=ctfPlayer] mayfly true
# Above line commented out as test world is not education edition

# Clears all players of the gameplay items
clear @a[tag=ctfPlayer] iron_sword
clear @a[tag=ctfPlayer] bow
clear @a[tag=ctfPlayer] cooked_beef
clear @a[tag=ctfPlayer] arrow
clear @a[tag=ctfPlayer] banner