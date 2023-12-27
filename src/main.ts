import { BlockVolume, BlockPermutation, ItemStack, Vector3, system, ScriptEventSource, Player, Camera, ScriptEventCommandMessageAfterEvent, world } from '@minecraft/server'

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
    teams.forEach((e) => {
        if (e.color == target) {
            return true;
        }
    })
    return false;
}

function sendMessage(e: ScriptEventCommandMessageAfterEvent, s: string) {
    if (e.sourceType == ScriptEventSource.Entity && e.sourceEntity.typeId == 'minecraft:player') {
        (e.sourceEntity as Player).sendMessage(s);
    }
}

interface Team {
    color: Teams,
    flagPos: Vector3,
    flagState: BlockPermutation
}

enum Teams {
    RED = 'red',
    BLUE = 'blue',
    GREEN = 'green',
    YELLOW = 'yellow'
}

interface Item {
    item: ItemStack,
    slot: number
}

interface Preview {
    start: Camera,
    end: Camera
}

interface GameMap {
    name: string
    teams: Team[],
    kit: Item[],
    area: BlockVolume,
    camera?: Preview
    //running: boolean
}

//players have tag ctf:${GameMap}:${Team} for team id

let maps = new Map<string, GameMap>();

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
            sendMessage(e, 'help\nexport\nimport\n')
            break;
        }
        //export
        case 'ctf:export': {
            break;
        }
        //import
        case 'ctf:import': {
            break;
        }
        //ui
        case 'ctf:ui': {
            break;
        }
        //addmap <id: string> <name: string> <startPos: x y z> <endPos: x y z>
        case 'ctf:addmap': {
            if (args.length < 8) {
                sendMessage(e, '§cERROR: Not enough arguments')
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
                kit: [],
                area: {from: start, to: end}
            })
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
            }
            if (!maps.has(args[0])) {
                sendMessage(e, '§cERROR: Map ' + args[0] + ' does not exist');
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
            maps.get(args[0]).teams.push({color: team, flagPos: pos, flagState: (e.sourceType == ScriptEventSource.Entity ? e.sourceEntity.dimension.getBlock(pos) : e.sourceBlock.dimension.getBlock(pos)).permutation.clone()})
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
            sendMessage(e, 'Removed team from map ' + args[0]);
            break;
        }
        //setspawn <map: string> <team: Team>
        case 'ctf:setspawn': {
            break;
        }
        //setspawn <map: string> <team: Team> <position: x y z>
        case 'ctf:setspawn': {
            break;
        }
        //setflagpos <map: string> <team: Team> <position: x y z>
        case 'ctf:setflagpos': {
            break;
        }
        //setkit <map: string>
        case 'ctf:setkit': {
            break;
        }
    }
}, {namespaces: ['ctf']})