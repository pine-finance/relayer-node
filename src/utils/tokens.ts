import Web3 from 'web3'

import { getIndexerId, IndexerTypes } from './process'
import { uniswapFactoryABI } from '../contracts'

export const MOST_USED_CONTRACTS = [
  { name: 'MANA', address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942' },
  { name: 'SAI', address: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359' },
  { name: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f' },
  { name: 'Tether', address: '0xdac17f958d2ee523a2206206994597c13d831ec7' },
  { name: 'BNB', address: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52' },
  { name: 'Bitfinex', address: '0x2af5d2ad76741191d15dfe7bf6ac92d4bd912ca3' },
  { name: 'HuobiToken', address: '0x6f259637dcd74c767781e37bc6133cd6a68aa161' },
  { name: 'MKR', address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2' },
  { name: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
  { name: 'Crypto.com', address: '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b' },
  { name: 'Aergo', address: '0xae31b85bfe62747d0836b82608b4830361a3d37a' },
  { name: 'sETH', address: '0x5e74c9036fb86bd7ecdcb084a0673efc32ea31cb' },
  { name: 'SHUF', address: '0x3A9FfF453d50D4Ac52A6890647b823379ba36B9E' },
  { name: 'WETH', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' },
  { name: 'CBIX7', address: '0xcf8f9555d55ce45a3a33a81d6ef99a2a2e71dee2' },
  { name: 'SUSD', address: '0x57ab1e02fee23774580c119740129eac7081e9d3' },
  { name: 'SETH', address: '0x5e74c9036fb86bd7ecdcb084a0673efc32ea31cb' },
  { name: 'Opyn ETH Put $150 04/24/20 (oETH $150...)', address: '0xaeFc7B368F7b536C9E5e3F342BF534931cE58584' },
  { name: 'HEX', address: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39' },
  { name: 'UBT', address: '0x8400d94a5cb0fa0d041a3788e395285d61c9ee5e' },
  { name: 'MINDS', address: '0xb26631c6dda06ad89b93c71400d25692de89c068' },
  { name: 'STAKE', address: '0x0ae055097c6d159879521c384f1d2123d1f195e6' },
  { name: 'STA', address: '0xa7DE087329BFcda5639247F96140f9DAbe3DeED1' },
  { name: "CMRA", address: '0x37737ad7e32ed440c312910cfc4a2e4d52867caf' },
  { name: "FOT", address: '0xD8595ac2836B7a8040f046E751B42088436B6365' },
  { name: "NEXO", address: "0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206" }
]

const uniswapTokenCache: { [key: string]: string } = {}
const web3 = new Web3(process.env.WEB3_HTTP_RPC_URL)
const uniswapFactory = new web3.eth.Contract(
  uniswapFactoryABI,
  process.env.UNISWAP_FACTORY_CONTRACT
)

export async function getTokensTotal(): Promise<number> {
  if (getIndexerId() === IndexerTypes.MOST_USED) {
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

    const tokenAddr = await uniswapFactory.methods.getTokenWithId(index + 1).call()

    uniswapTokenCache[index + 1] = tokenAddr
    return tokenAddr
  }
}
