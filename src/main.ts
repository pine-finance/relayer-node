import dotenv from 'dotenv'
import Web3 from 'web3'

import Indexer from './indexer'
import Monitor from './monitor'
import Book from './book'
import { retryAsync, logger } from './utils'
import Relayer from './relayer/Relayer'

dotenv.config()
//const OrdersManager = require('./orderManagers/ordersManager.js');
//const Monitor = require('./monitor.js');
//const Conector = require('./conector.js');
// const Handler = require('./handler.js');
// const read = require('read');
// const util = require('util');
// const retry = require('./retry.js');
// const logger = require('./logger.js');

async function setupRelayer() {
  const web3 = new Web3(process.env.WEB3_HTTP_RPC_URL)
  const indexer = new Indexer(web3)
  const monitor = new Monitor(web3)
  const book = new Book(web3)
  const relayer = new Relayer(web3)


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
    const allOrders = await book.getPendingOrders()

    for (const order of allOrders) {
      const exists = await retryAsync(book.exists(order))

      logger.debug(`Main: Loaded order ${order.txHash}`)

      if (exists) {
        // Check if order is ready to be filled and it's still pending
        if (
          (await book.canExecute(order))
        ) {
          logger.verbose(`Main: Filling order ${order.txHash}`)
          // Fill order, retry only 4 times
          const result = await retryAsync(relayer.fillOrder(order), 4)

          if (result != undefined) {
            book.setFilled(order, result)
          }
        } else {
          logger.debug(`Main: Order not ready to be filled ${order.txHash}`)
        }
      } else {
        logger.verbose(
          `Main: Order ${order.txHash} no long exists, removing it from pool`
        )
        // Set order as filled
        await book.setFilled(order, 'unknown')
      }
    }
  })
}

if (require.main === module) {
  console.log('******** Starting relayer ********')
  Promise.resolve()
    .then(() => setupRelayer())
    .catch(console.error)
}
