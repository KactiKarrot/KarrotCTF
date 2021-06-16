# Capture the Flag
Minecraft Bedrock addon for easy creation of Capture the Flag maps without having to work out technical parts.
--
## Description
This project is made to be applied to a world dedicated to capture the flag, however in theory it will work on any world, however there may be unexpected consequences. This is designed to make it easy for minigame map makers to create CtF maps without worying about all the technical command parts. As long as you follow these instructions everything should end up working.

## Initial World Setup

## Initial Map Setup
After following th initial world setup section, you can setup your map to work with this addon. You are going to need operator to set it up. First get yourself allow blocks with
```
/give @s allow 1 0
```
These blocks allow adventure mode players to break and place above and below them. This will ned to be placed in the same x/z coordinate as each flag. You can hide the allow blocks if you like, as they affect from y=0+. Next is going to be the items. The items will spawn in a chest. The default items are and iron sword and bow, both with 32k enchantments, an arrow, and 64 steak. This can adjusted if you know how to edit functions and know semi-basic commands. There is also a subpack with unenchanted gear instead. To choose where the chest will be placed, you must get a karrot:dummy_entity spawn egg from the creative inventory and place it in the block where the chest will be. Make sure you stand where the players will be standing, as the chest will face that direction.
