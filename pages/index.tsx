import { useEffect, useState } from 'react'
import { createDbWorker, WorkerHttpvfs } from 'sql.js-httpvfs'
import { SplitFileConfig } from 'sql.js-httpvfs/dist/sqlite.worker'

export async function getStaticProps(context) {
  const config = {
    from: 'inline',
    config: {
      serverMode: 'full',
      requestChunkSize: 4096,
      url: '/data.sqlite3'
    }
  } as SplitFileConfig
  return {
    props: { config }
  }
}

interface Props {
  config: SplitFileConfig
}

const Index = ({ config }: Props) => {
  const [status, setStatus] = useState<'loading' | 'loaded'>('loading')
  const [categories, setCategories] = useState([])

  useEffect(() => {
    if (status === 'loaded') return
    ;(async () => {
      const worker = await createDbWorker(
        [config],
        '/sqlite.worker.js',
        '/sql-wasm.wasm'
      )
      const [result] = await worker.db.exec(`select name from Categories`)
      const { values } = result
      setCategories(values.flat())
      setStatus('loaded')
    })()
  }, [status])

  return (
    <div>
      <h1>Categories</h1>
      {status === 'loading' && <span>Loading</span>}
      <ul>
        {categories.map((category) => {
          return <li key={category}>{category}</li>
        })}
      </ul>
    </div>
  )
}
export default Index
