import Web3 from 'web3'

import { getIndexerId, IndexerTypes } from './process'
import { retryAsync } from './retry'
import { uniswapFactoryABI } from '../contracts'

export const MOST_USED_CONTRACTS = [
  { name: 'MANA', address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942' },
  { name: 'DAI', address: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359' }
]

const uniswapTokenCache: { [key: string]: string } = {}
const web3 = new Web3(process.env.WEB3_HTTP_RPC_URL)
const uniswapFactory = new web3.eth.Contract(
  uniswapFactoryABI,
  process.env.UNISWAP_FACTORY_CONTRACT
)

export async function getTokensTotal(): Promise<number> {
  if (getIndexerId() === IndexerTypes.MOST_USED) { // TODO: use types
    return MOST_USED_CONTRACTS.length
  } else {
    return uniswapFactory.methods.tokenCount().call()
  }
}

export async function getTokenAddress(index: number): Promise<string> {
  if (getIndexerId() === IndexerTypes.MOST_USED) { // TODO: use types
    return MOST_USED_CONTRACTS[index].address
  } else {
    if (uniswapTokenCache[index + 1] != undefined) {
      return uniswapTokenCache[index + 1]
    }

    const tokenAddr = await retryAsync(
      uniswapFactory.methods.getTokenWithId(index + 1).call()
    )
    uniswapTokenCache[index + 1] = tokenAddr
    return tokenAddr
  }
}