replaceitem entity @a[tag=ctfPlayer] slot.inventory 8 arrow 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=ctfPlayer] slot.hotbar 8 cooked_beef 64 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
gamerule showtags false
gamerule keepinventory false
gamerule domobspawning false
gamerule pvp true
scoreboard objectives add timer dummy