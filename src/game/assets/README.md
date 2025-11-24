# Game Assets

This directory contains all game assets including textures, icons, sounds, and asset management systems.

## Structure

```
assets/
├── assetManager.ts      # Central asset management system
├── iconGenerator.tsx    # SVG icon generation for items/spells/UI
├── soundManager.ts      # Sound effect and music management
├── index.ts             # Asset exports
├── ASSET_STRATEGY.md    # Asset design strategy document
└── README.md            # This file
```

## Usage

### Asset Manager

```typescript
import { assetManager } from './game/assets'

// Generate procedural textures
const grassTexture = assetManager.generateGrassTexture()
const skyTexture = assetManager.generateSkyTexture()
const groundTexture = assetManager.generateGroundTexture()

// Create enhanced materials
const material = assetManager.createEnhancedMaterial(
  'player-human',
  '#00ffff',
  '#00ffff',
  { emissiveIntensity: 0.6, metalness: 0.7 }
)

// Preload all assets
await assetManager.preloadAssets()
```

### Icon Generator

```typescript
import { getItemIcon, getSpellIcon, getUIIcon } from './game/assets'

// Get icon component for an item
const ItemIcon = getItemIcon('quantum_blade')
if (ItemIcon) {
  return <ItemIcon size={32} color="#00ffff" />
}

// Get icon component for a spell
const SpellIcon = getSpellIcon('quantum_bolt')
if (SpellIcon) {
  return <SpellIcon size={24} color="#00ffff" />
}

// Get icon component for UI
const UIIcon = getUIIcon('inventory')
if (UIIcon) {
  return <UIIcon size={20} color="#00ffff" />
}
```

### Sound Manager

```typescript
import { soundManager } from './game/assets'

// Preload sounds
await soundManager.preloadSounds()

// Play sound effect
soundManager.playSound('hit', 0.8)

// Play music
soundManager.playMusic('ambient', true)

// Control volume
soundManager.setMasterVolume(0.7)
soundManager.setEffectsVolume(0.8)
soundManager.setMusicVolume(0.5)
```

## Asset Types

### Textures
- **Grass**: Procedurally generated grass texture
- **Sky**: Cyberpunk sky with stars and city glow
- **Ground**: Cyberpunk grid ground texture

### Icons
- **Weapons**: Quantum Blade, Plasma Rifle, Void Staff
- **Armor**: Cyber Helmet, Quantum Armor
- **Consumables**: Health Pack, Mana Cell, Energy Drink
- **Resources**: Quantum Crystal, Cyber Scrap, Void Essence, etc.
- **Spells**: All spell icons
- **UI**: Inventory, Crafting, Market, etc.

### Materials
- **Player Materials**: Race-specific materials with glow
- **Enemy Materials**: Tier-based materials (basic, elite, boss)
- **Item Materials**: Rarity-based materials

### Sounds
- **Hit**: Impact sounds
- **Explosion**: Explosion effects
- **Spell**: Spell casting sounds
- **Pickup**: Item pickup sounds
- **UI**: Interface interaction sounds

## Adding New Assets

### Adding a New Icon

1. Add icon definition to `iconGenerator.tsx`:
```typescript
export const NewIcons = {
  newItem: createIcon('new_item', 'M12 2L2 7L12 12L22 7L12 2Z'),
}
```

2. Add to icon map:
```typescript
export function getItemIcon(itemId: string): React.FC<IconProps> | null {
  const iconMap: Record<string, React.FC<IconProps>> = {
    // ... existing icons
    new_item: NewIcons.newItem,
  }
  return iconMap[itemId] || null
}
```

### Adding a New Texture

1. Add generation method to `assetManager.ts`:
```typescript
generateNewTexture(): THREE.Texture {
  return this.generateTexture('new_texture', 512, 512, (ctx) => {
    // Draw texture
  })
}
```

2. Add to preload:
```typescript
async preloadAssets(): Promise<void> {
  // ... existing textures
  this.generateNewTexture()
}
```

### Adding a New Sound

1. Add to `soundManager.ts`:
```typescript
async preloadSounds(): Promise<void> {
  // ... existing sounds
  this.generateSound('new-sound', 'hit')
}
```

2. Play the sound:
```typescript
soundManager.playSound('new-sound', 1.0)
```

## Performance Considerations

- **Texture Size**: Keep textures at reasonable sizes (512x512 or 1024x1024)
- **Icon Caching**: Icons are cached after first generation
- **Material Reuse**: Materials are cached and reused
- **LOD System**: Use LOD for distance-based quality reduction
- **Asset Cleanup**: Call `assetManager.dispose()` when cleaning up

## Best Practices

1. **Preload Assets**: Always preload assets before using them
2. **Cache Assets**: Use the asset manager's caching system
3. **Dispose Resources**: Clean up assets when no longer needed
4. **Optimize Textures**: Use appropriate texture sizes
5. **Reuse Materials**: Reuse materials instead of creating new ones
6. **LOD System**: Implement LOD for performance
7. **Quality Settings**: Respect quality settings for asset loading

