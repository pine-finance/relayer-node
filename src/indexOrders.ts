import dotenv from 'dotenv'
import Web3 from 'web3'
import { EventLog } from 'web3/types'

import { init } from './database'
import Indexer from './indexer'
import Monitor from './monitor'
import Book from './book'
import { retryAsync, logger } from './utils'

dotenv.config()

async function setupIndexer() {
  await init()
  const web3 = new Web3(process.env.WEB3_HTTP_RPC_URL)
  const indexer = new Indexer(web3)
  const monitor = new Monitor(web3)
  const book = new Book(web3)

  // Monitor new orders
  monitor.onBlock(async (newBlock: number) => {
    logger.verbose(`Main: Looking for new orders until block ${newBlock}`)
    await indexer.getOrders(
      newBlock,
      async (rawOrder: string, event: EventLog) => {
        await retryAsync(book.add(rawOrder, event))
      }
    )
  })
}

if (require.main === module) {
  console.log('******** Starting Indexer ********')
  Promise.resolve()
    .then(() => setupIndexer())
    .catch(console.error)
}
