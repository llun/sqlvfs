import zipObject from 'lodash/zipObject'
import { createDbWorker, WorkerHttpvfs } from 'sql.js-httpvfs'
import { SplitFileConfig } from 'sql.js-httpvfs/dist/sqlite.worker'

let worker: WorkerHttpvfs = null
export async function getWorker(
  config: SplitFileConfig
): Promise<WorkerHttpvfs> {
  if (!worker) {
    worker = await createDbWorker(
      [config],
      '/sqlite.worker.js',
      '/sql-wasm.wasm'
    )
  }
  return worker
}

export async function getCategories(worker: WorkerHttpvfs): Promise<string[]> {
  const [result] = await worker.db.exec(`select name from Categories`)
  const { values } = result
  return values.flat() as string[]
}

export interface Site {
  key: string
  category: string
  description: string
  title: string
  url: string
  updated_at: number
}
export async function getSites(
  worker: WorkerHttpvfs,
  category: string
): Promise<Site[]> {
  const [result] = await worker.db.exec(
    `select * from Sites where category = ?`,
    [category]
  )
  const { columns, values } = result
  return values.map((value) => zipObject(columns, value))
}
