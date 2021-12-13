import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { getInput, setFailed } from '@actions/core'
import { parseXML, parseAtom, parseRss, Site } from './parsers'

export async function loadFeed(
  title: string,
  url: string
): Promise<Site | null> {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'llun/feeds' }
    })
    const xml = await parseXML(response.data)
    if (xml.rss) return parseRss(title, xml)
    if (xml.feed) return parseAtom(title, xml)
    return null
  } catch (error) {
    console.error(error.message)
    console.error(error.stack)
    return null
  }
}

export async function readOpml(opmlContent: string): Promise<any> {
  const input = await parseXML(opmlContent)
  const body = input.opml.body
  const outlines = body[0].outline
  return outlines.reduce((out, outline) => {
    const category = outline.$.title
    const items = outline.outline
    out.push({
      category,
      items: items && items.map((item) => item.$)
    })
    return out
  }, [])
}
exports.readOpml = readOpml

export function createCategoryDirectory(
  rootDirectory: string,
  category: string
) {
  try {
    const stats = fs.statSync(path.join(rootDirectory, category))
    if (!stats.isDirectory()) {
      throw new Error(
        `${path.join(rootDirectory, category)} is not a directory`
      )
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Fail to access ${rootDirectory}`)
    }
    fs.mkdirSync(path.join(rootDirectory, category), { recursive: true })
  }
}

export async function writeFeedsContent() {
  try {
    const contentDirectory = getInput('outputDirectory', {
      required: true
    })
    const feedsFile = getInput('opmlFile', { required: true })
    const opmlContent = fs.readFileSync(feedsFile).toString('utf8')
    const opml = await readOpml(opmlContent)
    for (const category of opml) {
      const { category: title, items } = category
      createCategoryDirectory(contentDirectory, title)
      if (!items) continue
      console.log(`Load category ${title}`)
      for (const item of items) {
        const feedData = await loadFeed(item.title, item.xmlUrl)
        if (!feedData) {
          continue
        }
        console.log(`Load ${feedData.title}`)
        const sha256 = crypto.createHash('sha256')
        sha256.update(feedData.title)
        const hexTitle = sha256.digest('hex')
        fs.writeFileSync(
          path.join(contentDirectory, title, `${hexTitle}.json`),
          JSON.stringify(feedData)
        )
      }
    }
  } catch (error) {
    console.error(error.message)
    console.error(error.stack)
    setFailed(error)
  }
}
