import { ethers } from 'ethers'
import { Contract } from '@ethersproject/contracts'

import Relayer from './Relayer'
import { UNISWAP_V2_HANDLER_ADDRESSES } from '../contracts'
import { logger, getGasPrice } from '../utils'
import { Order } from '../book/types'
import HandlerABI from '../contracts/abis/Handler.json'

export default class UniswapV2Relayer {
  base: Relayer
  uniswapV2Handler: Contract

  constructor(base: Relayer) {
    this.base = base

    this.uniswapV2Handler = new Contract(
      UNISWAP_V2_HANDLER_ADDRESSES[base.chainId],
      HandlerABI,
      base.account
    )
  }

  async execute(order: Order): Promise<string | undefined> {
    // Get handler to use
    const handler = this.uniswapV2Handler
    if (!handler) {
      return
    }

    let params = this.getOrderExecutionParams(order, handler)

    // Get real estimated gas
    let estimatedGas = await this.base.estimateGasExecution(params)
    if (!estimatedGas) {
      return
    }

    let gasPrice = await getGasPrice()
    if (gasPrice.eq(0)) {
      gasPrice = await this.base.provider.getGasPrice()
    }

    let fee = this.base.getFee(gasPrice.mul(estimatedGas)) // gasPrice

    // Build execution params with fee
    params = this.getOrderExecutionParams(order, handler, fee)
    try {
      // simulate
      await this.base.pineCore.callStatic.executeOrder(...params, {
        from: this.base.account.address,
        gasLimit: estimatedGas.add(ethers.BigNumber.from(50000)),
        gasPrice
      })

      const isOrderOpen = await this.base.existOrder(order)
      if (!isOrderOpen) {
        return undefined
      }

      logger.info(`UniswapV2: can be executed: ${order.createdTxHash}`)

      //  execute
      const tx = await this.base.pineCore.executeOrder(...params, {
        from: this.base.account.address,
        gasLimit: estimatedGas.add(ethers.BigNumber.from(50000)),
        gasPrice: gasPrice
      })

      logger.info(
        `Relayer: Filled ${order.createdTxHash} order, executedTxHash: ${tx.hash}`
      )
      return tx.hash
    } catch (e) {
      logger.warn(
        `Relayer: Error filling order ${order.createdTxHash}: ${
          e.error ? e.error : e.message
        } `
      )
      return undefined
    }
  }

  getOrderExecutionParams(
    order: Order,
    handler: ethers.Contract,
    fee = ethers.BigNumber.from(1)
  ): any {
    return [
      order.module,
      order.inputToken,
      order.owner,
      this.base.abiCoder.encode(
        ['address', 'uint256'],
        [order.outputToken, order.minReturn.toString()]
      ),
      order.signature,
      this.base.abiCoder.encode(
        ['address', 'address', 'uint256'],
        [handler.address, this.base.account.address, fee.toString()]
      )
    ]
  }
}
