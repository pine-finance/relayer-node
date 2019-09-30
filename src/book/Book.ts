import Web3 from 'web3'
import { EventLog } from 'web3/types'
import Contract from 'web3/eth/contract'

import { db } from '../database'
import { uniswapexABI } from '../contracts'
import { retryAsync, logger } from '../utils'
import { Order } from './types'
import { buildId } from './utils'

export default class Book {
  w3: Web3
  uniswapex: Contract
  orders: Order[]
  filledOrders: { [key: string]: string }

  constructor(w3: Web3) {
    this.w3 = w3
    this.uniswapex = new w3.eth.Contract(
      uniswapexABI,
      process.env.UNISWAPEX_CONTRACT
    )
    this.orders = []
    this.filledOrders = {}
  }

  async add(data: string, event: EventLog) {
    logger.debug(`Book: Decoding raw order ${data}`)

    const order = await this.decode(data, event)
    logger.debug(
      `Book: Add new order ${order.owner} ${order.fromToken} -> ${order.toToken}`
    )

    this.orders.push(order)
    try {
      await db.saveOrder(order)
    } catch (e) {
      console.log(e.message) // @TODO: revisit this
    }
  }

  async exists(order: Order): Promise<boolean> {
    const exists = await this.uniswapex.methods
      .existOrder(
        order.fromToken,
        order.toToken,
        order.minReturn.toString(),
        order.fee.toString(),
        order.owner,
        order.witness
      )
      .call()

    logger.debug(
      `Book: Order ${order.txHash} does${exists ? '' : ' not'} exists`
    )

    return exists
  }

  async isReady(order: Order): Promise<boolean> {
    const ready = await this.uniswapex.methods
      .canExecuteOrder(
        order.fromToken,
        order.toToken,
        order.minReturn.toString(),
        order.fee.toString(),
        order.owner,
        order.witness
      )
      .call()

    logger.debug(`Book: Order ${order.txHash} is ${ready ? '' : 'not'} ready`)

    return ready
  }

  async decode(inputRawData: string, event: EventLog): Promise<Order> {
    const id = buildId(event)
    const txHash = event.transactionHash
    const data =
      inputRawData.length > 448
        ? `0x${inputRawData.substr(-448)}`
        : inputRawData

    logger.debug(`Book: Decodeding ${txHash}, raw: ${inputRawData}`)
    const decoded = await this.uniswapex.methods.decodeOrder(`${data}`).call()

    logger.debug(`Book: Decoded ${txHash} id        ${id}`)
    logger.debug(`Book: Decoded ${txHash} fromToken ${decoded.fromToken}`)
    logger.debug(`Book: Decoded ${txHash} toToken   ${decoded.toToken}`)
    logger.debug(`Book: Decoded ${txHash} minReturn ${decoded.minReturn}`)
    logger.debug(`Book: Decoded ${txHash} fee       ${decoded.fee}`)
    logger.debug(`Book: Decoded ${txHash} owner     ${decoded.owner}`)
    logger.debug(`Book: Decoded ${txHash} secret    ${decoded.secret}`)
    logger.debug(`Book: Decoded ${txHash} witness   ${decoded.witness}`)

    return {
      ...decoded,
      id,
      txHash
    }
  }

  async canExecute(order: Order): Promise<boolean> {
    return (
      (await retryAsync(this.isReady(order))) && (await this.isPending(order))
    )
  }

  getOpenOrders(): Order[] {
    const result = this.orders.filter(
      (o: Order) => this.filledOrders[o.txHash] === undefined
    )

    logger.debug(`Order manager: Retrieving ${result.length} pending orders`)

    return result
  }

  isPending(order: Order): boolean {
    const result = this.filledOrders[order.txHash] === undefined

    logger.debug(
      `Book: Order ${order.txHash} is ${result ? '' : 'not'} pending`
    )

    return result
  }

  setFilled(order: Order, executedTx: string): void {
    logger.debug(`Book: Order ${order.txHash} was filled by ${executedTx}`)

    this.filledOrders[order.txHash] = executedTx
  }
}
