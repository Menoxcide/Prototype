/**
 * Redis Service - Handles Redis connection and operations
 * Used for scaling across multiple server instances
 */

import { createClient, RedisClientType } from 'redis'

export interface RedisService {
  connect(): Promise<void>
  disconnect(): Promise<void>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  publish(channel: string, message: string): Promise<void>
  subscribe(channel: string, callback: (message: string) => void): Promise<void>
  lock(key: string, ttl: number): Promise<boolean>
  unlock(key: string): Promise<void>
}

class RedisServiceImpl implements RedisService {
  private client: ReturnType<typeof createClient> | null = null
  private subscribers: Map<string, ReturnType<typeof createClient>> = new Map()

  async connect(): Promise<void> {
    if (this.client?.isOpen) {
      return
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    this.client = createClient({ url: redisUrl })

    this.client.on('error', (err: Error) => {
      console.error('Redis Client Error:', err)
    })

    await this.client.connect()
    console.log('Connected to Redis')
  }

  async disconnect(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit()
      this.client = null
    }

    // Disconnect all subscribers
    for (const subscriber of this.subscribers.values()) {
      if (subscriber.isOpen) {
        await subscriber.quit()
      }
    }
    this.subscribers.clear()
  }

  async get(key: string): Promise<string | null> {
    if (!this.client?.isOpen) {
      await this.connect()
    }
    return await this.client!.get(key)
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!this.client?.isOpen) {
      await this.connect()
    }
    if (ttl) {
      await this.client!.setEx(key, ttl, value)
    } else {
      await this.client!.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client?.isOpen) {
      await this.connect()
    }
    await this.client!.del(key)
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client?.isOpen) {
      await this.connect()
    }
    const result = await this.client!.exists(key)
    return result > 0
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.client?.isOpen) {
      await this.connect()
    }
    await this.client!.publish(channel, message)
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    // Create separate subscriber client
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    const subscriber = createClient({ url: redisUrl })

    subscriber.on('error', (err: Error) => {
      console.error('Redis Subscriber Error:', err)
    })

    await subscriber.connect()
    await subscriber.subscribe(channel, (message: string) => {
      callback(message)
    })

    this.subscribers.set(channel, subscriber)
  }

  async lock(key: string, ttl: number): Promise<boolean> {
    if (!this.client?.isOpen) {
      await this.connect()
    }
    const lockKey = `lock:${key}`
    const result = await this.client!.setNX(lockKey, '1')
    if (result) {
      await this.client!.expire(lockKey, ttl)
      return true
    }
    return false
  }

  async unlock(key: string): Promise<void> {
    if (!this.client?.isOpen) {
      await this.connect()
    }
    const lockKey = `lock:${key}`
    await this.client!.del(lockKey)
  }
}

export const redisService = new RedisServiceImpl()

