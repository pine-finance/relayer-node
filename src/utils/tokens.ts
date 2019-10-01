import Web3 from 'web3'

import { getIndexerId, IndexerTypes } from './process'
import { retryAsync } from './retry'
import { uniswapFactoryABI } from '../contracts'

export const MOST_USED_CONTRACTS = [
  { name: 'MANA', address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942' },
  { name: 'DAI', address: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359' },
  { name: 'Tether', address: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
  { name: 'BNB', address: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52' },
  { name: 'Bitfinex', address: '0x2af5d2ad76741191d15dfe7bf6ac92d4bd912ca3' },
  { name: 'HuobiToken', address: '0x6f259637dcd74c767781e37bc6133cd6a68aa161' },
  { name: 'MKR', address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2' },
  { name: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
  { name: 'Crypto.com', address: '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b' },
  { name: 'Aergo', address: '0xae31b85bfe62747d0836b82608b4830361a3d37a' }
]

const uniswapTokenCache: { [key: string]: string } = {}
const web3 = new Web3(process.env.WEB3_HTTP_RPC_URL)
const uniswapFactory = new web3.eth.Contract(
  uniswapFactoryABI,
  process.env.UNISWAP_FACTORY_CONTRACT
)

export async function getTokensTotal(): Promise<number> {
  if (getIndexerId() === IndexerTypes.MOST_USED) {
    // TODO: use types
    return MOST_USED_CONTRACTS.length
  } else {
    return uniswapFactory.methods.tokenCount().call()
  }
}

export async function getTokenAddress(index: number): Promise<string> {
  if (getIndexerId() === IndexerTypes.MOST_USED) {
    // TODO: use types
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
