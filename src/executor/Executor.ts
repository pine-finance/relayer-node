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
      logger.info(`Executor: watch round ${openOrders.length} open orders`)
      for (const order of openOrders) {
        const exists = await this.book.exists(order)

        logger.debug(`Executor: Loaded order ${order.txHash}`)

        if (exists) {
          // Check if order is ready to be filled and it's still pending
          if (await this.book.canExecute(order)) {
            logger.info(`Executor: Filling order ${order.txHash}`)
            // Fill order, retry only 4 times
            const result = await this.relayer.fillOrder(order)

            if (result != undefined) {
              // this.book.setFilled(order, result)
              await db.saveOrder({ ...order, executedTx: result })
            }
          } else {
            logger.info(`Executor: Order not ready to be filled ${order.txHash}`)
          }
        } else {
          logger.info(
            `Executor: Order ${order.txHash} no longer exists, removing it from pool`
          )
          // Set order as filled
          await db.saveOrder({ ...order, executedTx: '0x' })
        }
      }
    } catch (e) {
      logger.info(`Executor: failed to watch round ${openOrders.length} open orders: ${e.message}`)
      await new Promise(resolve => setTimeout(resolve, 30000)) // sleep 30 seconds
    }
  }
}
