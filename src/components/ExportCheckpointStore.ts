const DATABASE_NAME = "exportify"
const DATABASE_VERSION = 1
const STORE_NAME = "export-checkpoints"

export interface CompletedPlaylistExport {
  playlistId: string
  index: number
  fileName: string
  csvData: string
}

export interface ExportCheckpoint {
  version: 1
  key: string
  playlistIds: string[]
  completed: CompletedPlaylistExport[]
  updatedAt: number
}

function stableHash(value: string): string {
  let hash = 2166136261

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16)
}

export function playlistExportId(playlist: any, index: number): string {
  return String(playlist.id || playlist.uri || `playlist-${index}`)
}

export function createExportSessionKey(playlists: any[], searchQuery: string, config: any): string {
  const playlistVersions = playlists.map((playlist, index) => ({
    id: playlistExportId(playlist, index),
    snapshotId: playlist.snapshot_id || null,
    trackCount: playlist.tracks?.total ?? null
  }))

  return `export-${stableHash(JSON.stringify({
    playlists: playlistVersions,
    searchQuery,
    config
  }))}`
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const database = await openDatabase()

  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode)
      const request = operation(transaction.objectStore(STORE_NAME))
      let result: T

      request.onsuccess = () => {
        result = request.result
      }
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

export class ExportCheckpointStore {
  async load(key: string): Promise<ExportCheckpoint | undefined> {
    return withStore<ExportCheckpoint | undefined>("readonly", store => store.get(key))
  }

  async save(checkpoint: ExportCheckpoint): Promise<void> {
    await withStore<IDBValidKey>("readwrite", store => store.put(checkpoint))
  }

  async remove(key: string): Promise<void> {
    await withStore<undefined>("readwrite", store => store.delete(key) as IDBRequest<undefined>)
  }
}
