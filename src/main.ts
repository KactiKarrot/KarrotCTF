import { BlockVolume, BlockPermutation, ItemStack, Vector3, system, ScriptEventSource, Player, Camera, ScriptEventCommandMessageAfterEvent, world, BlockSignComponent, EntityEquippableComponent, EquipmentSlot, EntityInventoryComponent, ItemComponentTypes, ItemEnchantsComponent, BlockInventoryComponent, Vector2, EasingType, Dimension, DimensionTypes, Scoreboard, Block, DisplaySlotId, EffectType, EffectTypes } from '@minecraft/server'

function parseArgs(s: string): {failed: boolean, result: string | string[]} {
    let split = s.split(' ');
    split.forEach((e, i) => {
        if (e.startsWith('"')) {
            let x;
            for (let j = i; j < split.length; j++) {
                if (split[j].endsWith('"')) {
                    x = j;
                    break;
                }
            }
            if (x == undefined) {
                return {failed: true, result: `Unclosed string at ${e}`};
            } else {
                split.splice(i, x - i + 1, split.slice(i, x + 1).join(' ').slice(1, -1));
            }
        }
    })
    return {failed: false, result: split};
}

async function sleep(ticks: number) {
    return new Promise((resolve) => {
      system.runTimeout(() => {
        resolve('resolved');
      }, ticks);
    });
}

function floorVector3(a: Vector3) {
    let floor: Vector3 = {
        x: Math.floor(a.x),
        y: Math.floor(a.y),
        z: Math.floor(a.z)
    }
    return floor
}

function replacer(key, value) {
    if(value instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(value.entries()), // or with spread: value: [...value]
        };
    } else {
        return value;
    }
  }

function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}

function hasTeam(teams: Team[], target: Teams): boolean {
    let found = false
    teams.forEach((e) => {
        if (e.color == target) {
            found = true
        }
    })
    return found;
}

function sendMessage(e: ScriptEventCommandMessageAfterEvent, s: string) {
    if (e.sourceType == ScriptEventSource.Entity && e.sourceEntity.typeId == 'minecraft:player') {
        (e.sourceEntity as Player).sendMessage(s);
    }
}

interface Team {
    color: Teams,
    spawnPos: Vector3,
    flagPos: Vector3,
    flagId: string,
    flagStates: Record<string, string | number | boolean>
}

enum Teams {
    RED = 'red',
    BLUE = 'blue',
    GREEN = 'green',
    YELLOW = 'yellow'
}

interface Preview {
    startPos: Vector3,
    startRot: Vector2,
    endPos: Vector3,
    endRot: Vector2
}

interface GameMap {
    name: string
    teams: Team[],
    kitPos: Vector3,
    area: BlockVolume,
    camera?: Preview
    //running: boolean
}

//players have tag ctf:${GameMap}:${Team} for team id

let maps = new Map<string, GameMap>();

let running = false;
let currentMap: {m: GameMap, i: string};

function saveMaps() {
    world.setDynamicProperty('karrot:ctfmaps', JSON.stringify(maps, replacer));
}

world.afterEvents.worldInitialize.subscribe((data) => {
    if (world.getDynamicProperty('karrot:ctfmaps') != undefined) {
        maps = JSON.parse(world.getDynamicProperty('karrot:ctfmaps') as string, reviver);
    }
})

system.afterEvents.scriptEventReceive.subscribe((e) => {
    let parsed = parseArgs(e.message)
    if (parsed.failed) {
        sendMessage(e, '§cERROR: ' + parsed.result)
    }
    let args = parsed.result as string[];
    switch (e.id.toLowerCase()) {
        //help
        case 'ctf:help': {
            sendMessage(e, '§ahelp\nexport\nimport\nui\nlistmaps\naddmap <id: string> <name: string> <startPos: x y z> <endPos: x y z>\ndelmap <id: string>\naddteam <map: string> <team: Team> <flagPos: x y z>\ndelteam <map: string> <team: Team>\nsetspawn <map: string> <team: Team> [position: x y z]\nsetflagpos <map: string> <team: Team> <position: x y z>\nsetkitpos <map: string> <pos: x y z>\nsetkit <map: string>\ndelpreview <map:string>\nsetpreviewfrom <map:string>\nsetpreviewto <map:string>\npreview <map:string>')
            break;
        }
        //debug
        case 'ctf:debug': {
            // (((e.sourceEntity as Player).getComponent('minecraft:inventory') as EntityInventoryComponent).container.getItem(0).getComponent(ItemComponentTypes.Enchants) as ItemEnchantsComponent).enchantments = (((e.sourceEntity as Player).getComponent('minecraft:equippable') as EntityEquippableComponent).getEquipment(EquipmentSlot.Mainhand).getComponent(ItemComponentTypes.Enchants) as ItemEnchantsComponent).enchantments
            //((e.sourceEntity as Player).getComponent('minecraft:inventory') as EntityInventoryComponent).container.getItem(0).
            sendMessage(e, `${JSON.stringify(maps.get('bug').teams[0])}`);
            break;
        }
        //export
        case 'ctf:export': {
            e.sourceEntity.dimension.getBlock(e.sourceEntity.location).setPermutation(BlockPermutation.resolve('standing_sign'));
            (e.sourceEntity.dimension.getBlock(e.sourceEntity.location).getComponent('minecraft:sign') as BlockSignComponent).setText(JSON.stringify(maps, replacer));
            break;
        }
        //import
        case 'ctf:import': {
            let count = 0;
            let failCount = 0;
            JSON.parse((e.sourceEntity.dimension.getBlock(e.sourceEntity.location).getComponent('minecraft:sign') as BlockSignComponent).getText(), reviver).forEach((m, i) => {
                if (maps.has(i)) {
                    failCount++;
                } else {
                    maps.set(i, m);
                    count++;
                }
            });
            sendMessage(e, `Imported ${count} maps (${failCount} failed)`);
            break;
        }
        //ui
        case 'ctf:ui': {
            break;
        }
        //listmaps
        case 'ctf:listmaps': {
            let msg = 'All Maps:';
            maps.forEach((m, i) => {
                msg += `\n  ID: ${i}`;
                msg += `\n  Name: ${m.name}`;
                msg += `\n  From ${m.area.from.x}, ${m.area.from.y}, ${m.area.from.z} to ${m.area.to.x}, ${m.area.to.y}, ${m.area.to.z}`
                msg += `\n  Item Chest Position: ${m?.kitPos?.x}, ${m?.kitPos?.y}, ${m?.kitPos?.z}`;
                if (m.camera != undefined) {
                    msg += `\n  Preview:`;
                    msg += `\n    From Position: ${m.camera.startPos.x}, ${m.camera.startPos.y}, ${m.camera.startPos.z}`;
                    msg += `\n    To Position: ${m.camera.endPos.x}, ${m.camera.endPos.y}, ${m.camera.endPos.z}`;
                }
                msg += `\n  Teams:`;
                m.teams.forEach(t => {
                    msg += `\n    Color: ${t.color}`;
                    msg += `\n    Flag Position: ${t.flagPos.x}, ${t.flagPos.y}, ${t.flagPos.z}`;
                })
            })
            sendMessage(e, msg);
            break;
        }
        //addmap <id: string> <name: string> <startPos: x y z> <endPos: x y z>
        case 'ctf:addmap': {
            if (args.length < 8) {
                sendMessage(e, '§cERROR: Not enough arguments')
                return
            }
            let id = args[0];
            if (maps.has(id)) {
                return;
            }
            let name = args[1]
            for (let i = 2; i < 8; i++) {
                if (isNaN(parseInt(args[i]))) {
                    return
                }
            }
            let start = {x: parseInt(args[2]), y: parseInt(args[3]), z: parseInt(args[4])}
            let end = {x: parseInt(args[5]), y: parseInt(args[6]), z: parseInt(args[7])}
            maps.set(id, {
                name: name,
                teams: [],
                kitPos: {x: Infinity, y: Infinity, z: Infinity},
                area: {from: start, to: end}
            })
            saveMaps();
            sendMessage(e, '§aAdded map ' + id)
            break;
        }
        //delmap <id: string>
        case 'ctf:delmap': {
            if (args.length < 1) {
                sendMessage(e, '§cERROR: Not enough arguments')
                return;
            }
            if (maps.delete(args[0])) {
                saveMaps();
                sendMessage(e, '§aRemoved map ' + args[0]);
            } else {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
            }
            break;
        }
        //addteam <map: string> <team: Team> <flagPos: x y z>
        case 'ctf:addteam': {
            if (args.length < 2) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            let team: Teams;
            switch (args[1].toLowerCase()) {
                case 'red': {
                    team = Teams.RED;
                    break;
                }
                case 'blue': {
                    team = Teams.BLUE;
                    break;
                }
                case 'green': {
                    team = Teams.GREEN;
                    break;
                }
                case 'yellow': {
                    team = Teams.YELLOW;
                    break;
                }
                default: {
                    sendMessage(e, '§cERROR: Invalid team: ' + args[1])
                    return;
                }
            }
            if (hasTeam(maps.get(args[0]).teams, team)) {
                sendMessage(e, '§cERROR: Team already exists on map ' + args[0]);
                return;
            }
            for (let i = 2; i < 5; i++) {
                if (isNaN(parseInt(args[i]))) {
                    return
                }
            }
            let pos = {x: parseInt(args[2]), y: parseInt(args[3]), z: parseInt(args[4])}
            maps.get(args[0]).teams.push({
                color: team,
                spawnPos: (e.sourceType == ScriptEventSource.Entity ? floorVector3(e.sourceEntity.location) : e.sourceBlock.location),
                flagPos: pos,
                flagId: (e.sourceType == ScriptEventSource.Entity ? e.sourceEntity.dimension.getBlock(pos) : e.sourceBlock.dimension.getBlock(pos)).permutation.type.id,
                flagStates: (e.sourceType == ScriptEventSource.Entity ? e.sourceEntity.dimension.getBlock(pos) : e.sourceBlock.dimension.getBlock(pos)).permutation.getAllStates()
            })
            saveMaps();
            sendMessage(e, `§aAdded ${team} to map ${args[0]}`);
            break;
        }
        //delteam <map: string> <team: Team>
        case 'ctf:delteam': {
            if (args.length < 2) {
                sendMessage(e, '§cERROR: Not enough arguments')
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist')
            }
            let team: Teams;
            switch (args[1].toLowerCase()) {
                case 'red': {
                    team = Teams.RED;
                    break;
                }
                case 'blue': {
                    team = Teams.BLUE;
                    break;
                }
                case 'green': {
                    team = Teams.GREEN;
                    break;
                }
                case 'yellow': {
                    team = Teams.YELLOW;
                    break;
                }
                default: {
                    sendMessage(e, '§cERROR: Invalid team: ' + args[1])
                    return;
                }
            }
            if (!hasTeam(maps.get(args[0]).teams, team)) {
                sendMessage(e, '§cERROR: Team does exist on map ' + args[0]);
            }
            maps.get(args[0]).teams.splice(
                maps.get(args[0]).teams.findIndex(t => {
                    return t.color == team;
                }), 1
            );
            saveMaps();
            sendMessage(e, 'Removed team from map ' + args[0]);
            break;
        }
        //setspawn <map: string> <team: Team> [position: x y z]
        case 'ctf:setspawn': {
            if (args.length < 2) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            let team: Teams;
            switch (args[1].toLowerCase()) {
                case 'red': {
                    team = Teams.RED;
                    break;
                }
                case 'blue': {
                    team = Teams.BLUE;
                    break;
                }
                case 'green': {
                    team = Teams.GREEN;
                    break;
                }
                case 'yellow': {
                    team = Teams.YELLOW;
                    break;
                }
                default: {
                    sendMessage(e, '§cERROR: Invalid team: ' + args[1])
                    return;
                }
            }
            if (!hasTeam(maps.get(args[0]).teams, team)) {
                sendMessage(e, '§cERROR: Team ' + team + ' does not exist on map ' + args[0]);
                return;
            }
            let pos = (e.sourceType == ScriptEventSource.Entity ? floorVector3(e.sourceEntity.location) : e.sourceBlock.location);
            if (args.length > 2) {
                if (args.length < 5) {
                    sendMessage(e, '§cERROR: Not enough arguments');
                    return;
                }
                for (let i = 2; i < 5; i++) {
                    if (isNaN(parseInt(args[i]))) {
                        return
                    }
                }
                pos = {x: parseInt(args[2]), y: parseInt(args[3]), z: parseInt(args[4])}
            }
            maps.get(args[0]).teams.find(t => {
                return t.color == team
            }).spawnPos = pos;
            sendMessage(e, `Set spawn position for team ${team} to ${pos.x}, ${pos.y}, ${pos.z}`)
            break;
        }
        //setflagpos <map: string> <team: Team> <position: x y z>
        case 'ctf:setflagpos': {
            if (args.length < 2) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            let team: Teams;
            switch (args[1].toLowerCase()) {
                case 'red': {
                    team = Teams.RED;
                    break;
                }
                case 'blue': {
                    team = Teams.BLUE;
                    break;
                }
                case 'green': {
                    team = Teams.GREEN;
                    break;
                }
                case 'yellow': {
                    team = Teams.YELLOW;
                    break;
                }
                default: {
                    sendMessage(e, '§cERROR: Invalid team: ' + args[1])
                    return;
                }
            }
            if (!hasTeam(maps.get(args[0]).teams, team)) {
                sendMessage(e, '§cERROR: Team ' + team + ' does not exist on map ' + args[0]);
                return;
            }
            let pos = (e.sourceType == ScriptEventSource.Entity ? floorVector3(e.sourceEntity.location) : e.sourceBlock.location);
            if (args.length > 2) {
                if (args.length < 5) {
                    sendMessage(e, '§cERROR: Not enough arguments');
                    return;
                }
                for (let i = 2; i < 5; i++) {
                    if (isNaN(parseInt(args[i]))) {
                        return
                    }
                }
                pos = {x: parseInt(args[2]), y: parseInt(args[3]), z: parseInt(args[4])}
            }
            let teams = maps.get(args[0]).teams.find(t => {
                return t.color == team
            })
            teams.flagPos = pos;
            teams.flagId = (e.sourceType == ScriptEventSource.Entity ? e.sourceEntity.dimension.getBlock(pos) : e.sourceBlock.dimension.getBlock(pos)).permutation.type.id;
            teams.flagStates = (e.sourceType == ScriptEventSource.Entity ? e.sourceEntity.dimension.getBlock(pos) : e.sourceBlock.dimension.getBlock(pos)).permutation.getAllStates();
            (e.sourceType == ScriptEventSource.Entity ? e.sourceEntity.dimension.getBlock(pos) : e.sourceBlock.dimension.getBlock(pos)).permutation.getItemStack().getComponents()
            saveMaps();
            sendMessage(e, `Set flag position for team ${team} to ${pos.x}, ${pos.y}, ${pos.z}`)
            break;
        }
        //setkitpos <map: string> <pos: x y z>
        case 'ctf:setkitpos': {
            if (args.length < 4) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            for (let i = 1; i < 4; i++) {
                if (isNaN(parseInt(args[i]))) {
                    return;
                }
            }
            maps.get(args[0]).kitPos = {x: parseInt(args[1]), y: parseInt(args[2]), z: parseInt(args[3])};
            saveMaps();
            sendMessage(e, '§aSet kit chest position');
            break;
        }
        //setkit <map: string>
        case 'ctf:setkit': {
            if (args.length < 1) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            let pos = maps.get(args[0]).kitPos;
            if (pos.x == Infinity) {
                return;
            }

            e.sourceEntity.dimension.getBlock(pos).setPermutation(BlockPermutation.resolve('minecraft:barrel'));

            let cont = (e.sourceEntity.dimension.getBlock(floorVector3(pos)).getComponent('minecraft:inventory') as BlockInventoryComponent).container;
            for(let i = 0; i < 9; i++) {
                cont.setItem(i, (e.sourceEntity.getComponent('minecraft:inventory') as EntityInventoryComponent).container.getItem(i))
            }
            cont.setItem(9, (e.sourceEntity.getComponent('minecraft:equippable') as EntityEquippableComponent).getEquipment(EquipmentSlot.Head));
            cont.setItem(10, (e.sourceEntity.getComponent('minecraft:equippable') as EntityEquippableComponent).getEquipment(EquipmentSlot.Chest));
            cont.setItem(11, (e.sourceEntity.getComponent('minecraft:equippable') as EntityEquippableComponent).getEquipment(EquipmentSlot.Legs));
            cont.setItem(12, (e.sourceEntity.getComponent('minecraft:equippable') as EntityEquippableComponent).getEquipment(EquipmentSlot.Feet));
            cont.setItem(13, (e.sourceEntity.getComponent('minecraft:equippable') as EntityEquippableComponent).getEquipment(EquipmentSlot.Offhand));
            sendMessage(e, '§aSet kit!')
            break;
        }
        //delpreview <map:string>
        case 'ctf:delpreview': {
            if (args.length < 1) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            maps.get(args[0]).camera = undefined;
            saveMaps();
            sendMessage(e, '§aRemoved preview for map ' + args[0])
        }
        //setpreviewfrom <map:string>
        case 'ctf:setpreviewfrom': {
            if (args.length < 1) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            if (maps.get(args[0]).camera == undefined) {
                maps.get(args[0]).camera = {
                    startPos: e.sourceEntity.getHeadLocation(),
                    startRot: e.sourceEntity.getRotation(),
                    endPos: null,
                    endRot: null
                }
            } else {
                maps.get(args[0]).camera.startPos = e.sourceEntity.getHeadLocation();
                maps.get(args[0]).camera.startRot = e.sourceEntity.getRotation();
            }
            saveMaps();
            sendMessage(e, '§aSet preview');
            break;
        }
        //setpreviewto <map:string>
        case 'ctf:setpreviewto': {
            if (args.length < 1) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            if (maps.get(args[0]).camera == undefined) {
                maps.get(args[0]).camera = {
                    endPos: e.sourceEntity.getHeadLocation(),
                    endRot: e.sourceEntity.getRotation(),
                    startPos: null,
                    startRot: null
                }
            } else {
                maps.get(args[0]).camera.endPos = e.sourceEntity.getHeadLocation();
                maps.get(args[0]).camera.endRot = e.sourceEntity.getRotation();
            }
            saveMaps();
            sendMessage(e, '§aSet preview');
            break;
        }
        //preview <map: string>
        case 'ctf:preview': {
            if (args.length < 1) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            preview([(e.sourceEntity as Player)], maps.get(args[0]))
            break;
        }
        //start <map: string>
        case 'ctf:start': {
            if (args.length < 1) {
                sendMessage(e, '§cERROR: Not enough arguments');
                return;
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
                return;
            }
            startGame(args[0]);
            break;
        }
        case 'ctf:stop': {
            running = false;
            currentMap = undefined;
            world.scoreboard.removeObjective('ctf');
            break;
        }
    }
}, {namespaces: ['ctf']})

function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

async function startGame(map: string) {
    if (running == true) {
        return;
    }
    currentMap = {m: maps.get(map), i: map};
    world.getAllPlayers().forEach(p => {
        p.getTags().forEach(t => {
            if (t.startsWith('ctf:')) {
                p.removeTag(t);
            }
        })
    })
    
    // let teams = Player[currentMap.m.teams.length][0];
    let teams = new Array<Array<Player>>(currentMap.m.teams.length);
    let players = shuffle(world.getPlayers({tags: ['ctf']})).forEach((p, i) => {
        if (teams[i % teams.length] == undefined) {
            teams[i % teams.length] = new Array<Player>(0);
        }
        teams[i % teams.length].push(p);
    });
    teams.forEach((t, i) => {
        t.forEach((p: Player) => {
            p.addTag('ctf:' + currentMap.i + ':' + currentMap.m.teams[i].color);
            p.setSpawnPoint({dimension: p.dimension, x: currentMap.m.teams[i].spawnPos.x, y: currentMap.m.teams[i].spawnPos.y, z: currentMap.m.teams[i].spawnPos.z});
            setInvToKit(p, currentMap.m);
            p.teleport(currentMap.m.teams[i].spawnPos);
            p.runCommand('inputpermission set @s movement disabled');
            p.runCommand('gamemode adventure @s');
            p.addEffect('saturation', 20000000, {amplifier: 255, showParticles: false});
        })
    })
    await preview(teams[0], currentMap.m);
    let objective = world.scoreboard.addObjective('ctf', '§aCapture the Flag: §b' + currentMap.m.name);
    world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, {objective: objective});
    currentMap.m.teams.forEach(t => {
        switch (t.color) {
            case Teams.RED: {
                objective.setScore('§4Red Team', 0);
                break;
            }
            case Teams.BLUE: {
                objective.setScore('§1Blue Team', 0);
                break;
            }
            case Teams.GREEN: {
                objective.setScore('§aGreen Team', 0);
                break;
            }
            case Teams.YELLOW: {
                objective.setScore('§gYellow Team', 0);
                break;
            }
        }
    })
    running = true;
    players = world.getPlayers({tags: ['ctf']});
    players.forEach((p: Player) => {
        p.onScreenDisplay.setTitle('§b' + currentMap.m.name)
    })
    await sleep(40);
    players.forEach((p: Player) => {
        p.onScreenDisplay.setTitle('§a3')
    })
    await sleep(20);
    players.forEach((p: Player) => {
        p.onScreenDisplay.setTitle('§a2')
    })
    await sleep(20);
    players.forEach((p: Player) => {
        p.onScreenDisplay.setTitle('§a1')
    })
    await sleep(20);
    players.forEach((p: Player) => {
        p.onScreenDisplay.setTitle('§aGO!')
        p.runCommand('inputpermission set @s movement enabled');
    })
}

function setInvToKit(p: Player, map: GameMap) {
    p.runCommand('clear @s');
    if (map.kitPos.x == Infinity) {
        return;
    }

    let cont = (p.dimension.getBlock(floorVector3(map.kitPos)).getComponent('minecraft:inventory') as BlockInventoryComponent).container;
    for(let i = 0; i < 9; i++) {
        (p.getComponent('minecraft:inventory') as EntityInventoryComponent).container.setItem(i, cont.getItem(i))
    }
    let comp = (p.getComponent('minecraft:equippable') as EntityEquippableComponent)
    comp.setEquipment(EquipmentSlot.Head, cont.getItem(9));
    comp.setEquipment(EquipmentSlot.Chest, cont.getItem(10));
    comp.setEquipment(EquipmentSlot.Legs, cont.getItem(11));
    comp.setEquipment(EquipmentSlot.Feet, cont.getItem(12));
    comp.setEquipment(EquipmentSlot.Offhand, cont.getItem(13));
}

world.afterEvents.playerSpawn.subscribe(e => {
    if (e.player.hasTag("ctf") && running) {
        setInvToKit(e.player, currentMap.m);
    }
})

function gameOver(winner: Teams) {
    running = false;
    currentMap = undefined;
    world.getPlayers({tags: ['ctf']}).forEach(p => {
        p.onScreenDisplay.setTitle('§a' + winner + ' team wins!')
        p.getTags().forEach(t => {
            if (t.startsWith('ctf:')) {
                p.removeTag(t);
            }
        })
    })
}

function hDistance(p: Player, pos: Vector3) {
    return Math.sqrt(Math.pow(Math.abs(Math.floor(p.location.x) - pos.x), 2) + Math.pow(Math.abs(Math.floor(p.location.z) - pos.z), 2))
}

function teamToData(t: Teams) {
    switch (t) {
        case Teams.RED: {
            return 1;
        }
        case Teams.BLUE: {
            return 4;
        }
        case Teams.GREEN: {
            return 10;
        }
        case Teams.YELLOW: {
            return 11;
        }
    }
}

system.runInterval(() => {
    if (!running || currentMap == undefined) {
        return;
    }

    let redFlag;
    let blueFlag;
    let greenFlag;
    let yellowFlag;

    let objective = world.scoreboard.getObjective('ctf')
    if (objective.hasParticipant('§4Red Team') && objective.getScore('§4Red Team') >= 5) {
        gameOver(Teams.RED);
        return;
    } else if (objective.hasParticipant('§1Blue Team') && objective.getScore('§1Blue Team') >= 5) {
        gameOver(Teams.BLUE);
        return;
    } else if (objective.hasParticipant('§aGreen Team') && objective.getScore('§aGreen Team') >= 5) {
        gameOver(Teams.GREEN);
        return;
    } else if (objective.hasParticipant('§gYellow Team') && objective.getScore('§gYellow Team') >= 5) {
        gameOver(Teams.YELLOW);
        return;
    }

    world.getAllPlayers().forEach(p => {
        if (p.hasTag('ctf') && (p.hasTag('ctf:' + currentMap.i + ':red') || p.hasTag('ctf:' + currentMap.i + ':green') || p.hasTag('ctf:' + currentMap.i + ':blue') || p.hasTag('ctf:' + currentMap.i + ':yellow'))) {
            if (p.runCommand(`testfor @s[hasitem={item=banner}]`).successCount > 0) {

                currentMap.m.teams.forEach(t => {
                    if (p.hasTag('ctf:' + currentMap.i + ':' + t.color) && hDistance(p, t.flagPos) <= 1.5) {
                        if (p.runCommand(`clear @s banner ${teamToData(t.color)}`).successCount > 0) {
                            p.dimension.getBlock(t.flagPos).setPermutation(BlockPermutation.resolve(t.flagId, t.flagStates));
                        }
                        currentMap.m.teams.forEach(team => {
                            if (team.color != t.color) {
                                if (p.runCommand(`clear @s banner ${teamToData(team.color)}`).successCount > 0) {
                                    switch (t.color) {
                                        case Teams.RED: {
                                            objective.addScore('§4Red Team', 1);
                                            break;
                                        }
                                        case Teams.BLUE: {
                                            objective.addScore('§1Blue Team', 1);
                                            break;
                                        }
                                        case Teams.GREEN: {
                                            objective.addScore('§aGreen Team', 1);
                                            break;
                                        }
                                        case Teams.YELLOW: {
                                            objective.addScore('§gYellow Team', 1);
                                            break;
                                        }
                                    }
                                    p.dimension.getBlock(team.flagPos).setPermutation(BlockPermutation.resolve(team.flagId, team.flagStates));
                                }
                            }
                        });
                    }
                })

                if (p.runCommand(`testfor @s[hasitem={item=banner, data=1}]`).successCount > 0) {
                    redFlag = p.nameTag;
                }
                if (p.runCommand(`testfor @s[hasitem={item=banner, data=4}]`).successCount > 0) {
                    blueFlag = p.nameTag;
                }
                if (p.runCommand(`testfor @s[hasitem={item=banner, data=10}]`).successCount > 0) {
                    greenFlag = p.nameTag;
                }
                if (p.runCommand(`testfor @s[hasitem={item=banner, data=11}]`).successCount > 0) {
                    yellowFlag = p.nameTag;
                }
                p.triggerEvent('karrot:gain_outline_shown');
            } else {
                p.triggerEvent('karrot:gain_outline_hidden');
            }
        }
    })
    let msg = '';
    if (redFlag != undefined) {
        msg += '§4Red Flag: ' + redFlag
    }
    if (blueFlag != undefined) {
        if (msg != '') {
            msg += ', ';
        }
        msg += '§1Blue Flag: ' + blueFlag
    }
    if (greenFlag != undefined) {
        if (msg != '') {
            msg += ', ';
        }
        msg += '§aGreen Flag: ' + greenFlag
    }
    if (yellowFlag != undefined) {
        if (msg != '') {
            msg += ', ';
        }
        msg += '§gYellow Flag: ' + yellowFlag
    }
    if (msg != '') {
        world.getPlayers({tags: ['ctf']}).forEach(p => {
            p.onScreenDisplay.setActionBar(msg)
        })
    }
    
})

system.runInterval(() => {
    if (running && currentMap != undefined) {
        currentMap.m.teams.forEach(t => {
            world.getDimension('minecraft:overworld').runCommand(`particle ctf:${t.color} ${t.flagPos.x + 1}.0 ${t.flagPos.y}.0 ${t.flagPos.z}.0`)
            world.getDimension('minecraft:overworld').runCommand(`particle ctf:${t.color} ${t.flagPos.x - 1}.0 ${t.flagPos.y}.0 ${t.flagPos.z}.0`)
            world.getDimension('minecraft:overworld').runCommand(`particle ctf:${t.color} ${t.flagPos.x}.0 ${t.flagPos.y}.0 ${t.flagPos.z + 1}.0`)
            world.getDimension('minecraft:overworld').runCommand(`particle ctf:${t.color} ${t.flagPos.x}.0 ${t.flagPos.y}.0 ${t.flagPos.z - 1}.0`)
            world.getDimension('minecraft:overworld').runCommand(`particle ctf:${t.color} ${t.flagPos.x + 0.75} ${t.flagPos.y}.0 ${t.flagPos.z - 0.75}`)
            world.getDimension('minecraft:overworld').runCommand(`particle ctf:${t.color} ${t.flagPos.x - 0.75} ${t.flagPos.y}.0 ${t.flagPos.z + 0.75}`)
            world.getDimension('minecraft:overworld').runCommand(`particle ctf:${t.color} ${t.flagPos.x + 0.75} ${t.flagPos.y}.0 ${t.flagPos.z + 0.75}`)
            world.getDimension('minecraft:overworld').runCommand(`particle ctf:${t.color} ${t.flagPos.x - 0.75} ${t.flagPos.y}.0 ${t.flagPos.z - 0.75}`)
        })
    }
}, 15)


async function preview(players: Player[], map: GameMap) {
    if (map.camera == undefined || map.camera.startPos == null || map.camera.endPos == null) {
        return;
    }
    players.forEach(player => {
        player.camera.setCamera('minecraft:free', {location: map.camera.startPos, rotation: map.camera.startRot});
        player.camera.setCamera('minecraft:free', {easeOptions: {easeTime: 10, easeType: EasingType.Linear}, location: map.camera.endPos, rotation: map.camera.endRot});
    })
    await sleep(180);
    players.forEach(player => {
        player.camera.fade({fadeColor: {blue: 1, red: 1, green: 1}, fadeTime: {fadeInTime: 1, fadeOutTime: 1, holdTime: 1}});
    });
    await sleep(20);
    players.forEach(player => {
        player.camera.clear()
    });
}