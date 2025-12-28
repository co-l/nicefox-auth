import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestClient, type TestClient } from 'nicefox-graphdb/packages/client/src/index.ts'
import { getClient, initClient, closeClient } from './graphdb.js'

describe('graphdb module', () => {
  let testClient: TestClient

  beforeAll(async () => {
    testClient = await createTestClient({ project: 'auth' })
  })

  afterAll(() => {
    testClient.close()
  })

  describe('initClient', () => {
    it('should initialize client with provided options', () => {
      // Using mock config - in real usage this would connect to actual server
      initClient({
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

    it('should return client after initialization', () => {
      initClient({
        url: 'http://localhost:8080',
        project: 'auth',
        env: 'test',
      })

      const client = getClient()
      expect(client).toBeDefined()
    })
  })

  describe('closeClient', () => {
    it('should clear the client instance', () => {
      initClient({
        url: 'http://localhost:8080',
        project: 'auth',
        env: 'test',
      })

      closeClient()
      expect(() => getClient()).toThrow('GraphDB client not initialized')
    })
  })
})
