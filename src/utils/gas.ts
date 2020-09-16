import fetch from 'isomorphic-fetch'
import { BigNumber } from 'ethers'

export async function getGasPrice(): Promise<BigNumber> {
  let gasPrice = BigNumber.from(0)

  // Chain Id should be mainnet to fetch gas data
  try {
    const res = await fetch('https://ethgasstation.info/json/ethgasAPI.json')
    const data = await res.json()
    // It comes as 100 when should be 10.0
    gasPrice = BigNumber.from(data.fastest / 10)
  } catch (e) {
    console.log('Error when fetching gas data:', e.message)
  }

  return gasPrice.mul(BigNumber.from(1e9))
}
