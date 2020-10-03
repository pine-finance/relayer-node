import { JsonRpcProvider } from '@ethersproject/providers'
import dotenv from 'dotenv'
dotenv.config()

import { connectDB, db } from './database'
import Indexer from './indexer'
import Monitor from './monitor'
import Book from './book'
import { Order } from './book/types'
import { logger, getIndexerId, getProviderURL, getNetworkName } from './utils'

async function setupIndexer() {
  await connectDB()

  const indexerId = getIndexerId()
  let block = await db.getLatestBlock(indexerId)

  const provider = new JsonRpcProvider(getProviderURL(), getNetworkName())

  const indexer = new Indexer(block)
  const monitor = new Monitor(provider)
  const book = new Book(provider)

  let steps = Number(process.env.BLOCKS_STEP) || 1000

  // Monitor new orders
  monitor.onBlock(async (newBlock: number) => {
    logger.info(`Main: Looking for new orders until block ${newBlock}`)
    const times = (newBlock - block) / steps + 1
    for (let i = 0; i < times; i++) {
      const fromBlock = steps * i + block

      // Stop the loop if last block is achieved
      if (fromBlock >= newBlock) {
        steps = 20 // Go each 20 blocks then
        continue
      }

      let toBlock = steps * (i + 1) + block

      if (toBlock >= newBlock) {
        toBlock = newBlock
      }

      await indexer.getOrders(fromBlock, toBlock, async (rawOrder: Order) => {
        await book.add(rawOrder)
      })
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
