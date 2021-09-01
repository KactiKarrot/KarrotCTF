execute @e[name="Red Banner", type=item] ~ ~ ~ tag @a remove hasRedFlag
execute @e[name="Red Banner", type=item] ~ ~ ~ tag @p[r=2] add hasRedFlag
execute @e[name="Blue Banner", type=item] ~ ~ ~ tag @a remove hasBlueFlag
execute @e[name="Blue Banner", type=item] ~ ~ ~ tag @p[r=2] add hasBlueFlag
execute @a[tag=hasRedFlag] ~ ~ ~ title @a[tag=ctfPlayer] actionbar §4@a[tag=hasRedFlag] has the red flag, §b@a[tag=hasBlueFlag] has the blue flag
execute @a[tag=hasBlueFlag] ~ ~ ~ title @a[tag=ctfPlayer] actionbar §4@a[tag=hasRedFlag] has the red flag, §b@a[tag=hasBlueFlag] has the blue flag
execute @a[tag=hasRedFlag] ~ ~ ~ title @a[tag=ctfSpectator] actionbar §4@a[tag=hasRedFlag] has the red flag, §b@a[tag=hasBlueFlag] has the blue flag
execute @a[tag=hasBlueFlag] ~ ~ ~ title @a[tag=ctfSpectator] actionbar §4@a[tag=hasRedFlag] has the red flag, §b@a[tag=hasBlueFlag] has the blue flag