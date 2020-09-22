import fetch from 'isomorphic-fetch'
import { BigNumber } from 'ethers'
import { ethers } from 'ethers'

export const BASE_FEE = ethers.BigNumber.from('14000000000000000') // 0,01 eth

export async function getGasPrice(): Promise<BigNumber> {
  let gasPrice = BigNumber.from(0)

  // Chain Id should be mainnet to fetch gas data
  try {
    // const res = await fetch('https://ethgasstation.info/json/ethgasAPI.json')
    const [resGasStation, resGasTracker, resHistoric] = await Promise.all([
      getGasStation(),
      getGasTracker(),
      gasTrackerHistoric()
    ])

    gasPrice = BigNumber.from(
      Math.max(
        resGasStation.toNumber(),
        resGasTracker.toNumber(),
        resHistoric.toNumber()
      )
    )
  } catch (e) {
    console.log('Error when fetching gas data:', e.message)
  }
  return gasPrice
}

async function getGasStation(): Promise<BigNumber> {
  let gasPrice = BigNumber.from(0)

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

async function getGasTracker(): Promise<BigNumber> {
  let gasPrice = BigNumber.from(0)
  try {
    const res = await fetch(
      'https://api.etherscan.io/api?module=gastracker&action=gasestimate&gasprice=2000000000&apikey=39MIMBN2J9SFTJW1RKQPYJI89BAPZEVJVD'
    )
    const data = await res.json()
    gasPrice = BigNumber.from(Math.round(data.result / 100))
  } catch (e) {
    console.log('Error when fetching gas data from gas tracker:', e.message)
  }

  return gasPrice.mul(BigNumber.from(1e9))
}

async function gasTrackerHistoric(): Promise<BigNumber> {
  let gasPrice = BigNumber.from(0)
  try {
    const res = await fetch(
      'https://etherscan.io/datasourceHandler?q=gashistoricaldata&draw=1&columns%5B0%5D%5Bdata%5D=lastBlock&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=age&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=safeGasPrice&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=proposeGasPrice&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=fastGasPrice&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&start=0&length=15&search%5Bvalue%5D=&search%5Bregex%5D=false'
    )
    const { data } = await res.json()
    gasPrice = BigNumber.from(
      Math.round(Number(data[0].fastGasPrice.replace(' gwei', '')))
    )
  } catch (e) {
    console.log('Error when fetching gas data from gas tracker:', e.message)
  }

  return gasPrice.mul(BigNumber.from(1e9))
}
