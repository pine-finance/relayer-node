import { JsonRpcProvider } from '@ethersproject/providers'

import { db } from '../database'
import { logger, api } from '../utils'
import { Order } from './types'

export default class Book {
  provider: JsonRpcProvider
  orders: Order[]
  filledOrders: { [key: string]: string }

  constructor(provider: JsonRpcProvider) {
    this.provider = provider
    this.orders = []
    this.filledOrders = {}
  }

  async exists(orders: Order[]): Promise<Order[]> {
    try {
      let ids = await api.getCancelledOrders(orders.map(o => o.id))
      return orders.filter(order => ids.some(id => id === order.id))
    } catch (e) {
      if (e.message.indexOf('Invalid JSON RPC response') !== -1) {
        throw new Error('invalid RPC call')
      }

      if (
        e.message.indexOf(
          'provider or signer is needed to resolve ENS names'
        ) !== -1
      ) {
        throw new Error(e.message)
      }

      return []
    }
  }

  setFilled(order: Order, executedTxHashHash: string): void {
    logger.debug(
      `Book: Order ${order.createdTxHash} was filled by ${executedTxHashHash}`
    )

    this.filledOrders[order.createdTxHash] = executedTxHashHash
  }

  async add(order: Order) {
    try {
      logger.debug(
        `Book: Add new order ${order.owner} ${order.inputToken} -> ${order.outputToken}`
      )

      this.orders.push(order)

      await db.saveOrder(order)
    } catch (e) {
      logger.info(
        `Book: Invalid order from createdTxHash: ${order.createdTxHash}. Error ${e.message}`
      )
    }
  }
}
