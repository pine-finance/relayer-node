import dotenv from 'dotenv'
dotenv.config()

import Web3 from 'web3'
import { EventLog } from 'web3/types'

import { connectDB, db } from './database'
import Indexer from './indexer'
import Monitor from './monitor'
import Book from './book'
import { retryAsync, logger, getIndexerId } from './utils'


async function setupIndexer() {
  await connectDB()

  const indexerId = getIndexerId()
  let block = await db.getLatestBlock(indexerId)

  const web3 = new Web3(process.env.WEB3_HTTP_RPC_URL)
  const indexer = new Indexer(web3, block)
  const monitor = new Monitor(web3)
  const book = new Book(web3)

  const steps = Number(process.env.BLOCKS_STEP) || 1000

  // Monitor new orders
  monitor.onBlock(async (newBlock: number) => {
    logger.verbose(`Main: Looking for new orders until block ${newBlock}`)
    const times = (newBlock - block) / steps + 1
    for (let i = 0; i < times; i++) {
      const fromBlock = steps * i + block

      // Stop the loop if last block is achieved
      if (fromBlock >= newBlock) {
        continue
      }

      let toBlock = steps * (i + 1) + block

      if (toBlock >= newBlock) {
        toBlock = newBlock
      }

      await indexer.getOrders(
        toBlock,
        async (rawOrder: string, event: EventLog) => {
          await retryAsync(book.add(rawOrder, event))
        }
      )
      await db.saveBlock(indexerId, toBlock)
    }
    block = newBlock
  })
}

if (require.main === module) {
  console.log('******** Starting Indexer ********')
  Promise.resolve()
    .then(() => setupIndexer())
    .catch(console.error)
}
