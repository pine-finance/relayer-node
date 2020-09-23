import { ethers } from 'ethers'
import { Contract } from '@ethersproject/contracts'

import Relayer from './Relayer'
import { KYBER_HANDLER_ADDRESSES } from '../contracts'
import { logger, BASE_FEE } from '../utils'
import { Order } from '../book/types'
import HandlerABI from '../contracts/abis/Handler.json'

export default class UniswapV2Relayer {
  base: Relayer
  kyberHandler: Contract

  constructor(base: Relayer) {
    this.base = base

    this.kyberHandler = new Contract(
      KYBER_HANDLER_ADDRESSES[base.chainId],
      HandlerABI,
      base.account
    )
  }

  async execute(order: Order): Promise<string | undefined> {
    // Get handler to use
    const handler = this.kyberHandler
    if (!handler) {
      return
    }

    let params = this.getOrderExecutionParams(order, handler)

    // Get real estimated gas
    let estimatedGas = await this.base.estimateGasExecution(params)
    if (!estimatedGas) {
      return
    }

    let gasPrice = ethers.BigNumber.from(1000000000) // await getGasPrice()
    if (gasPrice.eq(0)) {
      gasPrice = await this.base.provider.getGasPrice()
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
        return undefined
      }

      params = this.getOrderExecutionParams(
        order,
        handler,
        fee.sub(8000000000000000)
      )

      //  execute
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
      console.log(
        `Relayer: Error filling order ${order.createdTxHash}: ${e.error ? e.error : e.message
        } `
      )
      logger.warn(
        `Relayer: Error filling order ${order.createdTxHash}: ${e.error ? e.error : e.message
        } `
      )
      return undefined
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
