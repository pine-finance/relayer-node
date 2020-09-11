import Book from '../book'
import Relayer from '../relayer'
import { logger } from '../utils'
import { db } from '../database'

export default class Executor {
  book: Book
  relayer: Relayer

  constructor(book: Book, relayer: Relayer) {
    this.book = book
    this.relayer = relayer
  }

  async watchRound() {
    const openOrders = await db.getOpenOrders()

    try {
      console.log('')
      console.log('')
      logger.info(`Executor: watch round ${openOrders.length} open orders`)
      const cancelledOrders = await this.book.exists(openOrders)

      for (const order of cancelledOrders) {
        logger.info(
          `Executor: Order ${order.createdTxHash} no longer exists, removing it from pool`
        )
        // Set order as filled
        await db.saveOrder({ ...order, executedTxHash: '0x' })
      }

      for (const order of openOrders) {
        console.log('')
        logger.debug(`Executor: Trying to execute order ${order.createdTxHash}`)
        // Fill order, retry only 4 times
        const result = await this.relayer.executeOrder(order)

        if (result != undefined) {
          await db.saveOrder({ ...order, executedTxHash: result })
        } else {
          logger.info(`Executor: Order not ready to be filled ${order.createdTxHash}`)
        }
      }
    } catch (e) {
      logger.info(`Executor: failed to watch round ${openOrders.length} open orders: ${e.message}`)
      await new Promise(resolve => setTimeout(resolve, 30000)) // sleep 30 seconds
    }
  }
}
