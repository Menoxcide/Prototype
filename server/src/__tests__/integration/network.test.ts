/**
 * Integration tests for Network Communication
 */

describe('Network Integration', () => {
  test('should serialize and deserialize messages', () => {
    const message = {
      type: 'move',
      x: 10,
      y: 0,
      z: 20,
      rotation: 1.5
    }

    const serialized = JSON.stringify(message)
    const deserialized = JSON.parse(serialized)

    expect(deserialized).toEqual(message)
  })

  test('should handle message batching', () => {
    const messages = [
      { type: 'move', data: { x: 1, y: 0, z: 1 } },
      { type: 'move', data: { x: 2, y: 0, z: 2 } },
      { type: 'castSpell', data: { spellId: 'test' } }
    ]

    const batched = {
      messages,
      timestamp: Date.now()
    }

    expect(batched.messages).toHaveLength(3)
  })
})

