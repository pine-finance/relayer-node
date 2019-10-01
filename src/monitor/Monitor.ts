import Web3 from 'web3'

import { retryAsync } from '../utils'

export default class Monitor {
  w3: Web3

  constructor(w3: Web3) {
    this.w3 = w3
  }

  async onBlock(callback: (blockNumber: number) => Promise<any>) {
    let lastBlock = 0
    const w3 = this.w3
    async function loop() {
      const newBlock = await retryAsync(w3.eth.getBlockNumber())
      if (newBlock > lastBlock) {
        await retryAsync(callback(newBlock))
        lastBlock = newBlock
      }
      setTimeout(loop, Number(process.env.TIME_BETWEEN_BLOCK_CHECKS) || 5000)
    }
    loop()
  }
}
