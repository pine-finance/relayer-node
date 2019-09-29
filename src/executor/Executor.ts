import Book from "../book";
import Relayer from "../relayer"
import { retryAsync, logger } from '../utils'

export default class Executor {
  book: Book
  relayer: Relayer

  constructor(book: Book, relayer: Relayer) {
    this.book = book
    this.relayer = relayer
  }

  async watchRound() {
    const allOrders = await this.book.getPendingOrders()

    for (const order of allOrders) {
      const exists = await retryAsync(this.book.exists(order))

      logger.debug(`Executor: Loaded order ${order.txHash}`)

      if (exists) {
        // Check if order is ready to be filled and it's still pending
        if (
          (await this.book.canExecute(order))
        ) {
          logger.verbose(`Executor: Filling order ${order.txHash}`)
          // Fill order, retry only 4 times
          const result = await retryAsync(this.relayer.fillOrder(order), 4)

          if (result != undefined) {
            this.book.setFilled(order, result)
          }
        } else {
          logger.debug(`Executor: Order not ready to be filled ${order.txHash}`)
        }
      } else {
        logger.verbose(
          `Executor: Order ${order.txHash} no long exists, removing it from pool`
        )
        // Set order as filled
        await this.book.setFilled(order, '0x')
      }
    }
  }
}