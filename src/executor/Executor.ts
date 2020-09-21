import Book from '../book'
import Relayer from '../relayer'
import { logger } from '../utils'
import { db } from '../database'
import { Order } from '../book/types'

export default class Executor {
  book: Book
  relayer: Relayer
  currentOrders: { [key: string]: number }
  isLoop?: string

  constructor(book: Book, relayer: Relayer) {
    this.book = book
    this.relayer = relayer
    this.currentOrders = {}
    this.isLoop = process.env.IS_LOOP
  }

  async watchRound() {
    const openOrders = await db.getOpenOrders()

    try {
      console.log('')
      console.log('')
      logger.info(`Executor: watch round ${openOrders.length} open orders`)
      const cancelledOrders = await this.book.exists(openOrders)

      for (const order of cancelledOrders) {
        this.currentOrders[order.id] = 2 // Stop processing

        logger.info(
          `Executor: Order ${order.createdTxHash} no longer exists, removing it from pool`
        )
        // Set order as filled
        await db.saveOrder({ ...order, executedTxHash: '0x' })
      }

      for (const order of openOrders) {
        if (!this.isLoop && this.currentOrders[order.id] === 1) {
          continue
        }

        this.currentOrders[order.id] = 1

        await this.executeOrder(order)
      }
    } catch (e) {
      logger.info(
        `Executor: failed to watch round ${openOrders.length} open orders: ${e.message}`
      )
      await new Promise(resolve => setTimeout(resolve, 30000)) // sleep 30 seconds
    }
  }

  async executeOrder(order: Order) {
    if (!this.isLoop && this.currentOrders[order.id] === 2) {
      return
    }

    logger.debug(`Executor: Trying to execute order ${order.createdTxHash}`)
    // Fill order, retry only 4 times
    const result = await this.relayer.executeOrder(order)

    if (result != undefined) {
      await db.saveOrder({ ...order, executedTxHash: result })
    } else {
      logger.info(
        `Executor: Order not ready to be filled ${order.createdTxHash}`
      )
      if (!this.isLoop) {
        let delay = 1000
        // if ((Math.floor(Date.now() / 3600) / 60) % 2 !== 0) {
        //   delay = delay * 15
        // }
        setTimeout(async () => await this.executeOrder(order), delay)
      }
    }
  }
}
