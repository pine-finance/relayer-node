import { db } from '../database'
import {
  api,
  logger,
} from '../utils'
import { Order } from '../book/types'


export default class Indexer {
  lastMonitored: number

  constructor(block: number) {
    this.lastMonitored = block
  }

  async getOrders(
    fromBlock: number,
    toBlock: number,
    onRawOrder: (order: Order) => Promise<void>
  ) {
    if (toBlock <= this.lastMonitored) {
      logger.debug(`Indexer: skip getOrders, ${this.lastMonitored}-${toBlock}`)
      return
    }

    logger.debug(`Indexer: getOrders, ${this.lastMonitored}-${toBlock}`)

    const orders = await api.getOpenOrdersBetweenBlock(fromBlock, toBlock)

    logger.debug(`Indexer: Found new ${orders.length} orders`)

    for (const order of orders) {
      if (!(await db.existOrder(order.id))) {
        await onRawOrder(order)
      } else {
        logger.info(`Indexer: Found already indexed Order id: ${order.id}`)
      }
    }

    logger.info(
      `Indexer: Finished getOrders for range ${this.lastMonitored}-${toBlock}`
    )
    this.lastMonitored = toBlock
  }
}
