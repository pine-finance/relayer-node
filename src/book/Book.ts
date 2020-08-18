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

  async exists(order: Order): Promise<boolean> {
    const ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'.toLowerCase()

    try {
      let exists = await api.isOrderStillOpen(order.id)

      if (exists) {
        // Check if from and to tokens are valid address
        const isFromTokenContract = await this.provider.getCode(order.fromToken)
        const isToTokenContract = await this.provider.getCode(order.toToken)
        exists = (isFromTokenContract !== '0x' || order.fromToken.toLowerCase() === ethAddress) && (isToTokenContract !== '0x' || order.toToken.toLowerCase() === ethAddress)
      }

      return exists
    } catch (e) {
      if (e.message.indexOf('Invalid JSON RPC response') !== -1) {
        throw new Error('invalid RPC call')
      }

      if (e.message.indexOf('provider or signer is needed to resolve ENS names') !== -1) {
        throw new Error(e.message)
      }

      return true
    }
  }

  setFilled(order: Order, executedTxHashHash: string): void {
    logger.debug(`Book: Order ${order.createdTxHash} was filled by ${executedTxHashHash}`)

    this.filledOrders[order.createdTxHash] = executedTxHashHash
  }

  async add(order: Order) {
    try {
      logger.debug(
        `Book: Add new order ${order.owner} ${order.fromToken} -> ${order.toToken}`
      )

      this.orders.push(order)

      await db.saveOrder(order)
    } catch (e) {
      logger.info(`Book: Invalid order from createdTxHash: ${order.createdTxHash}. Error ${e.message}`)
    }
  }
}
