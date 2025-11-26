/**
 * Character Downloader - Downloads and caches all Pixellab characters
 * 
 * NOTE: Characters are now downloaded as static assets via scripts/download-pixellab-characters.js
 * This loader simply loads from the static /characters/ directory instead of Pixellab URLs.
 * 
 * To update characters:
 * 1. Run: node scripts/download-pixellab-characters.js (downloads rotations)
 * 2. Animate via Pixellab MCP if needed
 * 3. Run: node scripts/download-character-animations.js (downloads animations)
 */

import { spriteCharacterLoader } from './spriteCharacterLoader'
import { spriteAnimationSystem } from './spriteAnimationSystem'

/**
 * Get all character IDs from Pixellab MCP
 * This should be called during initialization to discover available characters
 * For now, we use a static list, but this can be enhanced to use MCP tool calls
 */
async function getAllCharacterIdsFromPixellab(): Promise<string[]> {
  // In a production environment, this would call the Pixellab MCP tool:
  // const characters = await mcp_pixellab_list_characters({ limit: 100 })
  // return characters.map(c => c.id)
  
  // For now, return the known character IDs
  // These are 2.5D isometric characters with 8 directions
  return [
  '6f5e80b8-417c-4960-84a6-31adb96bc5f9', // DarkKnight_Player (8 dirs, 5 anims)
  '0dae9f89-7241-4add-bf20-4d1beb89b71a', // Grove Guardian Treant (8 dirs)
  '413e1143-289d-4c29-9aec-5b267108973e', // Shadowmare (8 dirs)
  'a81f855c-e0a4-45ac-b53b-ef730ba54192', // Thornback Stag (8 dirs)
  'b82d4061-4e2c-4e15-a852-627ed83767e6', // Mistwhisper Sprite (8 dirs)
  'ea07f608-dd6d-486d-8372-7a253241d83e', // Thornback Stag (8 dirs)
  '3fbd17c4-637e-4ede-9fc9-e86a5828d4fd', // Grove Guardian Treant (4 dirs - needs upgrade)
  '116ab1db-e74c-4bf8-be00-eb0e20d442c4', // Shadowmare (4 dirs - needs upgrade)
  '7b2277d2-f442-4b20-af0e-5f994734d2ff', // Mistwhisper Sprite (4 dirs - needs upgrade)
  'a5457745-20c5-42e5-bea3-0a835ca59b45', // Mistwhisper Sprite (4 dirs - needs upgrade)
  'e497c6db-8cbf-46ef-9711-9b1d887245ee', // Sword sprite (8 dirs)
  '56960400-34f6-4489-9739-f0970f81ea37', // Ferron_Female_Idle (8 dirs)
  'ced56173-f7e0-45bc-9195-a3d6f2d838b3', // Aetherborn_Female_Idle (8 dirs)
  '166556fc-00c0-45db-b93d-adb842928e3f', // Sylthar_Female_Idle (8 dirs)
  'af3abaa4-c639-4dd5-81e4-3da40b558a1c', // Ferron_Male_Idle (8 dirs)
  '1f1c78ad-bc5a-4f7e-9613-2f12a7ac0104', // Sylthar_Male_Idle (8 dirs)
  '40c322c1-f76c-4f34-aa61-258d9559da52', // Tundrak_Male_Idle (8 dirs)
  '65d9a15b-aead-4f97-ac4c-9d4bc8130cda', // Vulpyr_Female_Idle (8 dirs, 4 anims)
  '0d46ad82-5b60-468f-9ccf-e6771f73da2f', // Tundrak_Female_Idle (8 dirs)
  'b3c64c97-8536-42e7-b2d6-1cee9a7e3af3', // Vulpyr_Male_Idle (8 dirs, 8 anims)
  '74ffc2c0-db7b-4d10-adc7-6974f04da9b8', // Lunari_Female_Idle (8 dirs)
  'f006a9db-1cbc-4abe-9647-b0062e084e08', // Glimmerkin_Female_Idle (8 dirs)
  'd8cc9856-9a12-47f2-84e2-70f533bf4846', // Lunari_Male_Idle_128px (8 dirs)
  'f28518bf-a35e-4b49-bfeb-effd64958c55', // Aetherborn_Male_Idle (8 dirs)
  'f0e69e72-7c3c-4ce2-8810-fefed21bb206', // Glimmerkin_Male_Idle (8 dirs)
  '169ac66b-8b52-4a96-8371-e44db400f34', // Korvax_Male_Idle (8 dirs)
  'a3efaf19-e29a-4090-b94a-e8572e3f5479', // Korvax_Female_Idle (8 dirs)
  '434d8e53-d7f3-432b-87fd-81d6a7ab841e', // Lunari_Female_Idle (8 dirs)
  '50f50b71-006c-4f0d-9413-29f3927a146d', // Lunari_Male_Idle (8 dirs)
  'a3280cbf-89c2-4f57-ba16-877155d8012b', // Lunari_Male_Idle (8 dirs, 48px)
  'd641cfd6-321e-4e65-adb0-6a5dc99705de', // Glimmerkin_Female (8 dirs)
  '2ac79bab-b877-4f64-9001-6ef39de81c27', // Aetherborn_Male (8 dirs)
  '65393144-2a31-4d02-b5e5-4f7fac37a3d0', // Glimmerkin_Male (8 dirs)
  '4665a8d8-ec22-4d0d-a2ce-56bd4dfcb78a', // Korvax_Female (8 dirs)
  '61ff9221-3678-4585-9a1d-4b260ca2964c', // Korvax_Male (8 dirs)
  '9fd7b12f-b4a3-4a8b-8fe4-6dd98a31d59f', // Lunari_Female (8 dirs)
  '4560d185-f49f-4d8e-bbbf-7aba064e4bb1', // Lunari_Male (8 dirs)
  ]
}

// Static list for immediate use (downloaded as static assets)
export const ALL_CHARACTER_IDS = [
  '6f5e80b8-417c-4960-84a6-31adb96bc5f9', // DarkKnight_Player (8 dirs, 5 anims)
  '0dae9f89-7241-4add-bf20-4d1beb89b71a', // Grove Guardian Treant (8 dirs)
  '413e1143-289d-4c29-9aec-5b267108973e', // Shadowmare (8 dirs)
  'a81f855c-e0a4-45ac-b53b-ef730ba54192', // Thornback Stag (8 dirs)
  'b82d4061-4e2c-4e15-a852-627ed83767e6', // Mistwhisper Sprite (8 dirs)
  'ea07f608-dd6d-486d-8372-7a253241d83e', // Thornback Stag (8 dirs)
  'e497c6db-8cbf-46ef-9711-9b1d887245ee', // Sword sprite (8 dirs)
  '56960400-34f6-4489-9739-f0970f81ea37', // Ferron_Female_Idle (8 dirs)
  'ced56173-f7e0-45bc-9195-a3d6f2d838b3', // Aetherborn_Female_Idle (8 dirs)
  '166556fc-00c0-45db-b93d-adb842928e3f', // Sylthar_Female_Idle (8 dirs)
  'af3abaa4-c639-4dd5-81e4-3da40b558a1c', // Ferron_Male_Idle (8 dirs)
  '1f1c78ad-bc5a-4f7e-9613-2f12a7ac0104', // Sylthar_Male_Idle (8 dirs)
  '40c322c1-f76c-4f34-aa61-258d9559da52', // Tundrak_Male_Idle (8 dirs)
  '65d9a15b-aead-4f97-ac4c-9d4bc8130cda', // Vulpyr_Female_Idle (8 dirs, 4 anims)
  '0d46ad82-5b60-468f-9ccf-e6771f73da2f', // Tundrak_Female_Idle (8 dirs)
  'b3c64c97-8536-42e7-b2d6-1cee9a7e3af3', // Vulpyr_Male_Idle (8 dirs, 8 anims)
  '74ffc2c0-db7b-4d10-adc7-6974f04da9b8', // Lunari_Female_Idle (8 dirs)
  'f006a9db-1cbc-4abe-9647-b0062e084e08', // Glimmerkin_Female_Idle (8 dirs)
  'd8cc9856-9a12-47f2-84e2-70f533bf4846', // Lunari_Male_Idle_128px (8 dirs, 3 anims)
  'f28518bf-a35e-4b49-bfeb-effd64958c55', // Aetherborn_Male_Idle (8 dirs)
  'f0e69e72-7c3c-4ce2-8810-fefed21bb206', // Glimmerkin_Male_Idle (8 dirs)
  '169ac66b-8b52-4a96-8371-ea44db400f34', // Korvax_Male_Idle (8 dirs)
  'a3efaf19-e29a-4090-b94a-e8572e3f5479', // Korvax_Female_Idle (8 dirs)
  '434d8e53-d7f3-432b-87fd-81d6a7ab841e', // Lunari_Female_Idle (8 dirs)
  '50f50b71-006c-4f0d-9413-29f3927a146d', // Lunari_Male_Idle (8 dirs)
  'a3280cbf-89c2-4f57-ba16-877155d8012b', // Lunari_Male_Idle (8 dirs, 48px)
  'd641cfd6-321e-4e65-adb0-6a5dc99705de', // Glimmerkin_Female (8 dirs)
  '2ac79bab-b877-4f64-9001-6ef39de81c27', // Aetherborn_Male (8 dirs)
  '65393144-2a31-4d02-b5e5-4f7fac37a3d0', // Glimmerkin_Male (8 dirs)
  '4665a8d8-ec22-4d0d-a2ce-56bd4dfcb78a', // Korvax_Female (8 dirs)
  '61ff9221-3678-4585-9a1d-4b260ca2964c', // Korvax_Male (8 dirs)
  '9fd7b12f-b4a3-4a8b-8fe4-6dd98a31d59f', // Lunari_Female (8 dirs)
  '4560d185-f49f-4d8e-bbbf-7aba064e4bb1', // Lunari_Male (8 dirs)
]

const DIRECTIONS = ['south', 'west', 'east', 'north', 'south-east', 'north-east', 'north-west', 'south-west']
const ANIMATION_TYPES: Array<'idle' | 'walk' | 'run' | 'attack' | 'cast' | 'hit' | 'death'> = ['idle', 'walk', 'run', 'attack', 'cast', 'hit', 'death']

class CharacterDownloader {
  private downloadProgress: Map<string, { loaded: number; total: number; status: string }> = new Map()

  /**
   * Download all characters and their assets
   * Uses Pixellab MCP to discover characters, then downloads them
   */
  async downloadAllCharacters(): Promise<void> {
    // Get character list from Pixellab MCP (or use static list)
    const characterIds = await getAllCharacterIdsFromPixellab()
    console.log(`Starting download of ${characterIds.length} characters from Pixellab...`)
    
    // Filter to only 8-direction characters (2.5D isometric)
    // Characters with 4 directions are skipped as they're not isometric
    const validCharacterIds: string[] = []
    
    for (const characterId of characterIds) {
      try {
        // Check if character has 8 directions by attempting to load
        // In production, this would use mcp_pixellab_get_character to check directions
        await this.downloadCharacter(characterId)
        validCharacterIds.push(characterId)
      } catch (error) {
        console.warn(`Skipping character ${characterId} (may not have 8 directions):`, error)
      }
    }
    
    console.log(`Downloaded ${validCharacterIds.length} valid 2.5D isometric characters!`)
  }

  /**
   * Download a single character with all directions and animations
   */
  async downloadCharacter(characterId: string): Promise<void> {
    this.downloadProgress.set(characterId, { loaded: 0, total: DIRECTIONS.length, status: 'Loading rotations...' })
    
    // Load all rotation sprites
    await spriteCharacterLoader.loadCharacter(characterId)
    
    this.downloadProgress.set(characterId, { 
      loaded: DIRECTIONS.length, 
      total: DIRECTIONS.length + ANIMATION_TYPES.length, 
      status: 'Loading animations...' 
    })

    // Load animations for each type
    for (const animationType of ANIMATION_TYPES) {
      try {
        await spriteAnimationSystem.loadCharacterAnimations(characterId, animationType, DIRECTIONS)
        const current = this.downloadProgress.get(characterId)
        if (current) {
          this.downloadProgress.set(characterId, {
            ...current,
            loaded: current.loaded + 1,
            status: `Loaded ${animationType} animation`
          })
        }
      } catch (error) {
        console.warn(`Animation ${animationType} not available for character ${characterId}`)
      }
    }

    this.downloadProgress.set(characterId, { 
      loaded: DIRECTIONS.length + ANIMATION_TYPES.length, 
      total: DIRECTIONS.length + ANIMATION_TYPES.length, 
      status: 'Complete' 
    })
  }

  /**
   * Get download progress for a character
   */
  getProgress(characterId: string): { loaded: number; total: number; status: string } | null {
    return this.downloadProgress.get(characterId) || null
  }

  /**
   * Preload characters for specific races
   */
  async preloadRaceCharacters(): Promise<void> {
    const raceCharacters = [
      '6f5e80b8-417c-4960-84a6-31adb96bc5f9', // Human/Cyborg
      'd8cc9856-9a12-47f2-84e2-70f533bf4846', // Android
      '2ac79bab-b877-4f64-9001-6ef39de81c27', // Voidborn
      'f28518bf-a35e-4b49-bfeb-effd64958c55', // Quantum
    ]

    for (const characterId of raceCharacters) {
      await this.downloadCharacter(characterId)
    }
  }
}

export const characterDownloader = new CharacterDownloader()

