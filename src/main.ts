import { BlockVolume, BlockPermutation, ItemStack, Vector3, system, ScriptEventSource, Player, Camera } from '@minecraft/server'

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

function hasTeam(teams: Team[], target: Teams): boolean {
    teams.forEach((e) => {
        if (e.color == target) {
            return true;
        }
    })
    return false;
}

interface Team {
    color: Teams,
    FlagPos: Vector3,
    FlagState: BlockPermutation
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

system.afterEvents.scriptEventReceive.subscribe((event) => {
    let parsed = parseArgs(event.message)
    if (parsed.failed) {
        if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
            (event.sourceEntity as Player).sendMessage('§cERROR: ' + parsed.result);
        }
    }
    let args = parsed.result as string[];
    switch (event.id.toLowerCase()) {
        //help
        case 'ctf:help': {
            if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                (event.sourceEntity as Player).sendMessage('help\nexport\nimport\n');
            }
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
                if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                    (event.sourceEntity as Player).sendMessage('§cERROR: Not enough arguments');
                }
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
            if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                (event.sourceEntity as Player).sendMessage('§aAdded map ' + id);
            }
            break;
        }
        //delmap <id: string>
        case 'ctf:delmap': {
            if (args.length < 1) {
                if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                    (event.sourceEntity as Player).sendMessage('§cERROR: Not enough arguments');
                }
            }
            if (!maps.has(args[0])) {
                if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                    (event.sourceEntity as Player).sendMessage('§cERROR: Map ' + args[0] + ' does not exist');
                }
            }
            if (maps.delete(args[0]) && event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                (event.sourceEntity as Player).sendMessage('§aRemoved map ' + args[0]);
            }
            break;
        }
        //addteam <map: string> <team: Team>
        case 'ctf:addteam': {
            if (args.length < 2) {
                if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                    (event.sourceEntity as Player).sendMessage('§cERROR: Not enough arguments');
                }
            }
            if (!maps.has(args[0])) {
                if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                    (event.sourceEntity as Player).sendMessage('§cERROR: Map ' + args[0] + ' does not exist');
                }
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
            }
            if (hasTeam(maps.get(args[0]).teams, team)) {
                if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                    (event.sourceEntity as Player).sendMessage('§cERROR: Map ' + args[0] + ' does not exist');
                }
            }
            break;
        }
        //delteam <map: string> <team: Team>
        case 'ctf:delteam': {
            if (args.length < 2) {
                if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                    (event.sourceEntity as Player).sendMessage('§cERROR: Not enough arguments');
                }
            }
            if (!maps.has(args[0])) {
                if (event.sourceType == ScriptEventSource.Entity && event.sourceEntity.typeId == 'minecraft:player') {
                    (event.sourceEntity as Player).sendMessage('§cERROR: Map ' + args[0] + ' does not exist');
                }
            }

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