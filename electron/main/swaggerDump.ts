import * as https from 'https'
import * as fs from 'fs'
import * as path from 'path'

const SWAGGER_URL = 'https://127.0.0.1:2999/swagger/v2/swagger.json'
const OUTPUT_PATH = path.join(process.cwd(), 'docs', 'swagger-dump.json')

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timed out'))
    })
  })
}

export async function dumpSwagger(): Promise<void> {
  const raw = await httpsGet(SWAGGER_URL)
  const parsed = JSON.parse(raw)
  const pretty = JSON.stringify(parsed, null, 2)
  fs.writeFileSync(OUTPUT_PATH, pretty, 'utf-8')
  console.log(`[swaggerDump] Written to ${OUTPUT_PATH}`)
}
