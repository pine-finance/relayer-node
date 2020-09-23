import { logger } from '../utils'

export const NETWORK_NAMES: { [key: string]: string } = {
  '1': 'mainnet',
  '4': 'rinkeby'
}

export function getProviderURL(): string {
  const privateNodeURL = process.env.PRIVATE_NODE_URL
  if (privateNodeURL) {
    logger.info(privateNodeURL)
    return privateNodeURL
  }

  const chainId = process.env.CHAIN_ID

  if (chainId === undefined) {
    throw new Error('CHAIN_ID undefined')
  }

  const network = NETWORK_NAMES[chainId]
  if (!network) {
    throw new Error('INVALID NETWORK')
  }

  logger.info(`https://${network}.infura.io/v3/${process.env.INFURA_ID}`)
  return `https://${network}.infura.io/v3/${process.env.INFURA_ID}`
}

export function getNetworkName(): string {
  const chainId = process.env.CHAIN_ID

  if (chainId === undefined) {
    throw new Error('CHAIN_ID undefined')
  }

  return NETWORK_NAMES[chainId]
}
