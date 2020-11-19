import { ethers } from 'ethers'
import { Contract } from '@ethersproject/contracts'

import Relayer from './Relayer'
import { UNISWAP_V2_HANDLER_ADDRESSES } from '../contracts'
import { logger, getGasPrice, BASE_FEE } from '../utils'
import { Order } from '../book/types'
import HandlerABI from '../contracts/abis/Handler.json'

const timeBetweenExecution = Number(process.env.TIME_BETWEEN_EXECUTION || 0)

export default class UniswapV2Relayer {
  base: Relayer
  uniswapV2Handler: Contract
  candidates: { [key: string]: number }

  constructor(base: Relayer) {
    this.base = base
    this.candidates = {}

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
      this.candidates[order.id] = 0
      return
    }

    let gasPrice = await getGasPrice()
    if (gasPrice.eq(0)) {
      gasPrice = await this.base.provider.getGasPrice()
    }

    if (gasPrice.toNumber() > 200000000000) {
      this.candidates[order.id] = 0
      return
    }

    let fee = this.base.getFee(gasPrice.mul(estimatedGas)) // gasPrice

    // Build execution params with fee
    params = this.getOrderExecutionParams(order, handler, fee)
    try {
      const gasLimit = estimatedGas.add(ethers.BigNumber.from(50000))
      // simulate
      if (process.env.PRIVATE_NODE_URL) {
        // Infura at estimate eth_call does not revert
        await this.base.pineCore.callStatic.executeOrder(...params, {
          from: this.base.account.address,
          gasLimit,
          gasPrice
        })
      } else {
        await Promise.all([
          this.base.pineCore.callStatic.executeOrder(...params, {
            from: this.base.account.address,
            gasLimit,
            gasPrice
          }),
          this.base.estimateGasExecution(params)
        ])
      }

      const isOrderOpen = await this.base.existOrder(order)
      if (!isOrderOpen) {
        this.candidates[order.id] = 0
        return
      }

      const now = Date.now()
      if (this.candidates[order.id] === 0) {
        this.candidates[order.id] = now
        return
      }

      // Check if the rate keeps between blocks
      if (now - this.candidates[order.id] < timeBetweenExecution) {
        return
      }

      params = this.getOrderExecutionParams(
        order,
        handler,
        fee.sub(8000000000000000)
      )

      // execute
      const tx = await this.base.pineCore.executeOrder(...params, {
        from: this.base.account.address,
        gasLimit,
        gasPrice
      })

      logger.info(
        `Relayer: Filled ${order.createdTxHash} order, executedTxHash: ${tx.hash}`
      )
      return tx.hash
    } catch (e) {
      logger.warn(
        `Relayer: Error filling order ${order.createdTxHash}: ${e.error ? e.error : e.message
        } `
      )

      this.candidates[order.id] = 0
      return
    }
  }

  getOrderExecutionParams(
    order: Order,
    handler: ethers.Contract,
    fee = BASE_FEE
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
