import dotenv from 'dotenv'
import Web3 from 'web3'

import Indexer from './indexer'
import Monitor from './monitor'
import Book from './book'
import Relayer from './relayer'
import Executor from './executor'
import { retryAsync, logger } from './utils'

dotenv.config()

async function setupRelayer() {
  const web3 = new Web3(process.env.WEB3_HTTP_RPC_URL)
  const indexer = new Indexer(web3)
  const monitor = new Monitor(web3)
  const book = new Book(web3)
  const relayer = new Relayer(web3)
  const executor = new Executor(book, relayer)

  // Monitor new orders
  monitor.onBlock(async (newBlock: number) => {
    logger.verbose(`Main: Looking for new orders until block ${newBlock}`)
    await indexer.getOrders(
      newBlock,
      async (rawOrder: string, txHash: string) => {
        await retryAsync(book.add(rawOrder, txHash))
      }
    )
  })

  monitor.onBlock(async (_: number) => {
    logger.verbose(`Main: Handling pending orders`)
    await executor.watchRound()
  })
}

if (require.main === module) {
  console.log('******** Starting relayer ********')
  Promise.resolve()
    .then(() => setupRelayer())
    .catch(console.error)
}
