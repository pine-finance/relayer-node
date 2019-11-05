import Web3 from 'web3'

import { logger } from '../utils'

export default class Monitor {
  w3: Web3
  timeBetweenPendingChecks: number

  constructor(w3: Web3) {
    this.w3 = w3
    this.timeBetweenPendingChecks = Number(process.env.TIME_BETWEEN_BLOCK_CHECKS) || 5000

  }

  async onBlock(callback: (blockNumber: number) => Promise<any>) {
    let lastBlock = 0
    const { w3, timeBetweenPendingChecks } = this

    async function loop() {
      try {
        const newBlock = await w3.eth.getBlockNumber()
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
