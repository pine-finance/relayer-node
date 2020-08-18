import { JsonRpcProvider } from '@ethersproject/providers'


import { logger } from '../utils'

export default class Monitor {
  provider: JsonRpcProvider
  timeBetweenPendingChecks: number

  constructor(provider: JsonRpcProvider) {
    this.provider = provider
    this.timeBetweenPendingChecks = Number(process.env.TIME_BETWEEN_BLOCK_CHECKS) || 5000

  }

  async onBlock(callback: (blockNumber: number) => Promise<any>) {
    let lastBlock = 0
    const { provider, timeBetweenPendingChecks } = this

    async function loop() {
      try {
        const newBlock = await provider.getBlockNumber()
        if (newBlock > lastBlock) {
          await callback(newBlock)
          lastBlock = newBlock
        }
        setTimeout(loop, timeBetweenPendingChecks)
      } catch (e) {
        logger.info(e.message)
        if (e.message.indexOf('Invalid JSON RPC response') !== -1) {
          logger.info(`Retrying loop in ${timeBetweenPendingChecks * 10 / 1000 / 60} minutes....`)
          setTimeout(loop, timeBetweenPendingChecks * 10)
        }
      }
    }
    loop()
  }
}
