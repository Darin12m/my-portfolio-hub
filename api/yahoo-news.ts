import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { symbol } = req.query

  if (!symbol) {
    return res.status(400).json({ error: 'Missing symbol' })
  }

  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=5`
  const r = await fetch(url)
  const data = await r.json()

  res.setHeader('Cache-Control', 's-maxage=300')
  res.status(200).json(data.news || [])
}
