import { NiceFoxGraphDB, type ClientOptions } from 'nicefox-graphdb/packages/client/src/index.ts'

let client: NiceFoxGraphDB | null = null

export function initClient(options: ClientOptions): void {
  client = new NiceFoxGraphDB(options)
}

export function getClient(): NiceFoxGraphDB {
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
