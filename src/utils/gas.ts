import fetch from 'isomorphic-fetch'

export async function getGasPrice(): Promise<number> {
  let gasPrice = 0

  // Chain Id should be mainnet to fetch gas data
  try {
    const res = await fetch('https://ethgasstation.info/json/ethgasAPI.json')
    const data = await res.json()
    // It comes as 100 when should be 10.0
    gasPrice = data.fast / 10
  } catch (e) {
    console.log('Error when fetching gas data:', e.message)
  }

  return gasPrice * 1e9
}