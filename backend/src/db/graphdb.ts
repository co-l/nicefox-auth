import { GraphDB, type GraphDBClient, type GraphDBOptions } from 'nicefox-graphdb'

let client: GraphDBClient | null = null

export async function initClient(options: GraphDBOptions): Promise<void> {
  client = await GraphDB(options)
}

export function getClient(): GraphDBClient {
  if (!client) {
    throw new Error('GraphDB client not initialized. Call initClient() first.')
  }
  return client
}

export async function verifyConnection(): Promise<void> {
  const c = getClient()
  const health = await c.health()
  if (health.status !== 'ok') {
    throw new Error(`GraphDB health check failed: ${health.status}`)
  }
  console.log('Connected to GraphDB')
}

export function closeClient(): void {
  client = null
}
