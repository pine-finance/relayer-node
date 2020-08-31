export const NETWORK_NAMES: { [key: string]: string } = {
  '1': 'mainnet',
  '4': 'rinkeby'
}

export function getInfuraURL(): string {
  const chainId = process.env.CHAIN_ID

  if (chainId === undefined) {
    throw new Error('CHAIN_ID undefined')
  }

  const network = NETWORK_NAMES[chainId]
  if (!network) {
    throw new Error('INVALID NETWORK')
  }

  console.log(`https://${network}.infura.io/v3/${process.env.INFURA_ID}`)
  return `https://${network}.infura.io/v3/${process.env.INFURA_ID}`
}

export function getNetworkName(): string {
  const chainId = process.env.CHAIN_ID

  if (chainId === undefined) {
    throw new Error('CHAIN_ID undefined')
  }

  return NETWORK_NAMES[chainId]
}