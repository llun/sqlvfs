import { Database } from 'sqlite3'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { writeFeedsContent } from './feeds'
import { Site } from './feeds/parsers'

const CONTENT_PATH = './contents'

function getCategories() {
  return fs.readdirSync(CONTENT_PATH)
}

function getSites(category: string): Site[] {
  const categoryPath = path.join(CONTENT_PATH, category)
  const sites = fs.readdirSync(categoryPath)
  return sites.map((site) =>
    JSON.parse(fs.readFileSync(path.join(categoryPath, site)).toString('utf-8'))
  )
}

function hash(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

async function main() {
  if (process.env.LOAD_FEEDS) {
    await writeFeedsContent()
  }
  fs.rmSync('./public/data.sqlite3', { force: true, recursive: true })
  const database = new Database('./public/data.sqlite3')
  database.serialize(async () => {
    database.run('create table Categories (name TEXT PRIMARY KEY)')
    database.run(
      'create table Sites (key TEXT PRIMARY KEY, title TEXT NOT NULL UNIQUE, category TEXT NOT NULL, url TEXT, description TEXT, updated_at INTEGER NOT NULL)'
    )
    database.run(
      'create table Entries (key TEXT PRIMARY KEY, site TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, content TEXT NOT NULL, content_date INTEGER, updated_at INTEGER NOT NULL)'
    )

    const categories = getCategories()
    const insertCategoryStmt = database.prepare(
      'insert into Categories values (?)'
    )
    const insertSiteStmt = database.prepare(
      'insert into Sites values (?, ?, ?, ?, ?, ?)'
    )
    const insertEntryStmt = database.prepare(
      'insert into Entries values (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (let category of categories) {
      insertCategoryStmt.run(category)

      const sites = getSites(category)
      for (let site of sites) {
        const siteKey = hash(site.title)
        const updatedAt = site.updatedAt || Date.now()
        insertSiteStmt.run(
          siteKey,
          site.title,
          category,
          site.link,
          site.description,
          Math.floor(updatedAt / 1000)
        )

        for (let entry of site.entries) {
          const entryKey = hash(`${entry.title}${entry.link}`)
          const now = Date.now()
          const contentDate = entry.date
            ? Math.floor(entry.date / 1000)
            : Math.floor(now / 1000)
          const updatedAt = Math.floor((entry.date || now) / 1000)
          insertEntryStmt.run(
            entryKey,
            siteKey,
            category,
            entry.title,
            entry.link,
            entry.content,
            contentDate,
            updatedAt
          )
        }
      }
    }

    database.run('pragma journal_mode = delete;')
    database.run('pragma page_size = 1024;')
    database.run('vacuum')
  })
}

main()
