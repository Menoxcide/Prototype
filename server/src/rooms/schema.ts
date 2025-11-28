import { Schema, MapSchema, type, ArraySchema } from '@colyseus/schema'

export class PlayerSchema extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('string') race: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') z: number = 0
  @type('number') rotation: number = 0
  @type('number') health: number = 100
  @type('number') maxHealth: number = 100
  @type('number') mana: number = 100
  @type('number') maxMana: number = 100
  @type('number') level: number = 1
  @type('string') guildId: string = ''
  @type('string') guildTag: string = ''
  @type('string') guildName: string = ''
}

export class EnemySchema extends Schema {
  @type('string') id: string = ''
  @type('string') type: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') z: number = 0
  @type('number') rotation: number = 0
  @type('number') health: number = 100
  @type('number') maxHealth: number = 100
  @type('number') level: number = 1
  @type('string') ownerId: string = ''
}

export class ResourceNodeSchema extends Schema {
  @type('string') id: string = ''
  @type('string') type: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') z: number = 0
  @type('number') lastHarvested: number = 0
  @type('number') respawnTime: number = 30000
}

export class LootDropSchema extends Schema {
  @type('string') id: string = ''
  @type('string') itemId: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') z: number = 0
  @type('string') ownerId: string = ''
  @type('number') expiresAt: number = 0
}

export class PowerUpSchema extends Schema {
  @type('string') id: string = ''
  @type('string') powerUpId: string = ''
  @type('string') type: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') z: number = 0
  @type('number') spawnTime: number = 0
  @type('number') expiresAt: number = 0
}

export class SpellProjectileSchema extends Schema {
  @type('string') id: string = ''
  @type('string') spellId: string = ''
  @type('string') casterId: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('number') z: number = 0
  @type('number') directionX: number = 0
  @type('number') directionY: number = 0
  @type('number') directionZ: number = 0
  @type('number') speed: number = 10
  @type('number') lifetime: number = 0
}

export class GuildSchema extends Schema {
  @type('string') id: string = ''
  @type('string') name: string = ''
  @type('string') tag: string = ''
  @type('string') leaderId: string = ''
  @type({ array: 'string' }) memberIds: ArraySchema<string> = new ArraySchema<string>()
  @type('number') createdAt: number = 0
}

export class NexusRoomState extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>()
  @type({ map: EnemySchema }) enemies = new MapSchema<EnemySchema>()
  @type({ map: ResourceNodeSchema }) resourceNodes = new MapSchema<ResourceNodeSchema>()
  @type({ map: LootDropSchema }) lootDrops = new MapSchema<LootDropSchema>()
  @type({ map: PowerUpSchema }) powerUps = new MapSchema<PowerUpSchema>()
  @type({ map: SpellProjectileSchema }) spellProjectiles = new MapSchema<SpellProjectileSchema>()
  @type({ map: GuildSchema }) guilds = new MapSchema<GuildSchema>()
  @type('number') worldBossSpawnTime: number = 0
  @type('boolean') worldBossActive: boolean = false
}
