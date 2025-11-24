/**
 * Unit tests for RateLimiter utility
 */

import { rateLimiter, RATE_LIMITS } from '../../utils/rateLimiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    rateLimiter.clear()
  })

  test('should allow request within limit', () => {
    const result = rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9) // 10 - 1
  })

  test('should reject request exceeding limit', () => {
    // Exhaust limit
    for (let i = 0; i < 10; i++) {
      rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    }

    const result = rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  test('should track limits per player', () => {
    rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    const result2 = rateLimiter.checkLimit('player2', 'chat', RATE_LIMITS.CHAT)

    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(9)
  })

  test('should track limits per action', () => {
    rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    const result = rateLimiter.checkLimit('player1', 'spellCast', RATE_LIMITS.SPELL_CAST)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(29) // 30 - 1
  })

  test('should reset limit after window expires', async () => {
    // Exhaust limit
    for (let i = 0; i < 10; i++) {
      rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    }

    // Wait for window to expire (mock time)
    const originalDateNow = Date.now
    Date.now = jest.fn(() => originalDateNow() + 11000) // 11 seconds later

    const result = rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    expect(result.allowed).toBe(true)

    Date.now = originalDateNow
  })

  test('should clear limits', () => {
    rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    rateLimiter.clear()

    const result = rateLimiter.checkLimit('player1', 'chat', RATE_LIMITS.CHAT)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
  })
})

