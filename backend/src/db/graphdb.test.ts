// Set NODE_ENV before importing GraphDB so it uses local client
process.env.NODE_ENV = 'development'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { GraphDB, type GraphDBClient } from 'nicefox-graphdb'
import { getClient, initClient, closeClient } from './graphdb.js'

describe('graphdb module', () => {
  let testClient: GraphDBClient

  beforeAll(async () => {
    testClient = await GraphDB({ project: 'auth', url: '', dataPath: ':memory:' })
  })

  afterAll(() => {
    testClient.close()
  })

  describe('initClient', () => {
    it('should initialize client with provided options', async () => {
      // Using mock config - in real usage this would connect to actual server
      await initClient({
        url: 'http://localhost:8080',
        project: 'auth',
        env: 'test',
        apiKey: 'test-key',
      })

      const client = getClient()
      expect(client).toBeDefined()
    })
  })

  describe('getClient', () => {
    it('should throw if client is not initialized', () => {
      closeClient()
      expect(() => getClient()).toThrow('GraphDB client not initialized')
    })

    it('should return client after initialization', async () => {
      await initClient({
        url: 'http://localhost:8080',
        project: 'auth',
        env: 'test',
      })

      const client = getClient()
      expect(client).toBeDefined()
    })
  })

  describe('closeClient', () => {
    it('should clear the client instance', async () => {
      await initClient({
        url: 'http://localhost:8080',
        project: 'auth',
        env: 'test',
      })

      closeClient()
      expect(() => getClient()).toThrow('GraphDB client not initialized')
    })
  })
})
