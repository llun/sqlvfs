import { useEffect, useState } from 'react'
import { SplitFileConfig } from 'sql.js-httpvfs/dist/sqlite.worker'
import { getCategories, getSites, getWorker, Site } from '../lib/database'

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
interface CategoryMenu {
  name: string
  selected: boolean
}
const Index = ({ config }: Props) => {
  const [status, setStatus] = useState<'loading' | 'loaded'>('loading')
  const [categories, setCategories] = useState<CategoryMenu[]>([])
  const [sites, setSites] = useState<Site[]>([])

  useEffect(() => {
    if (status === 'loaded') return
    ;(async () => {
      const worker = await getWorker(config)
      const categories = await getCategories(worker)
      setCategories(categories.map((name) => ({ name, selected: false })))
      setStatus('loaded')
    })()
  }, [status])

  async function selectCategory(selected: CategoryMenu) {
    if (selected.selected) {
      setCategories(
        categories.map((category) => ({
          ...category,
          selected: false
        }))
      )
      setSites([])
      return
    }
    const worker = await getWorker(config)
    const sites = await getSites(worker, selected.name)
    setCategories(
      categories.map((category) => ({
        ...category,
        selected: category.name === selected.name
      }))
    )
    setSites(sites)
  }

  return (
    <div>
      <h1>Categories</h1>
      {status === 'loading' && <span>Loading</span>}
      <ul>
        {categories.map((category) => {
          return (
            <li
              key={category.name}
              style={{ cursor: 'pointer' }}
              onClick={() => selectCategory(category)}
            >
              {!category.selected && category.name}
              {category.selected && <strong>{category.name}</strong>}
              {category.selected && (
                <div>
                  {sites.map((site) => (
                    <p key={site.key}>{site.title}</p>
                  ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
export default Index
