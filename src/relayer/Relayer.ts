import { ethers } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import { Contract } from '@ethersproject/contracts'
import { joinSignature } from '@ethersproject/bytes'


import { Order } from '../book/types'
import pineCoreBI from '../contracts/abis/PineCore.json'
import uniswapV1HandlerABI from '../contracts/abis/UniswapV1Handler.json'
import uniswapV2HandlerABI from '../contracts/abis/UniswapV2Handler.json'
import { PINE_CORE_ADDRESSES, UNISWAP_V1_HANDLER_ADDRESSES, UNISWAP_V2_HANDLER_ADDRESSES } from '../contracts'

import { logger, getGasPrice } from '../utils'

const BASE_FEE = ethers.BigNumber.from('10000000000000000') // 0,01 eth


export default class Relayer {
  provider: JsonRpcProvider
  pineCore: Contract
  uniswapV1Handler: Contract
  uniswapV2Handler: Contract
  account: Wallet
  abiCoder: ethers.utils.AbiCoder

  constructor(provider: JsonRpcProvider) {
    const { CHAIN_ID, SENDER_ADDRESS, SENDER_PRIVKEY } = process.env

    this.provider = provider
    this.abiCoder = new ethers.utils.AbiCoder()


    const privateKey =
      SENDER_PRIVKEY && SENDER_PRIVKEY.startsWith('0x')
        ? SENDER_PRIVKEY
        : `0x${SENDER_PRIVKEY}`

    const account = new Wallet(privateKey, provider)

    if (SENDER_ADDRESS!.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error('Expected public key does not correspond to the private')
    }
    logger.info(`Relayer: Using account ${account.address}`)

    this.account = account

    this.pineCore = new Contract(
      (PINE_CORE_ADDRESSES as any)[CHAIN_ID || 1],
      pineCoreBI,
      account
    )

    this.uniswapV1Handler = new Contract(
      (UNISWAP_V1_HANDLER_ADDRESSES as any)[CHAIN_ID || 1],
      uniswapV1HandlerABI as any,
      account
    )

    this.uniswapV2Handler = new Contract(
      (UNISWAP_V2_HANDLER_ADDRESSES as any)[CHAIN_ID || 1],
      uniswapV2HandlerABI as any,
      account
    )
  }

  async getFinalFee(gas = ethers.BigNumber.from(200000)): Promise<ethers.BigNumber> { // 200,000 seems to be an avg of gas for execution
    const gasPrice = await this.provider.getGasPrice()
    return BASE_FEE.add(gas.mul(gasPrice))
  }

  async sign(address: string, priv: string): Promise<string> {
    const hash = ethers.utils.solidityKeccak256(['address'], [address])

    const wallet = new Wallet(priv)

    // Unsafe but not for this.
    return joinSignature(wallet._signingKey().signDigest(hash))
  }

  async executeOrder(order: Order): Promise<string | undefined> {
    // Get handler to use
    const handler = await this.getHandler(order)
    if (!handler) {
      return
    }

    // Sign message
    const signature = await this.sign(this.account.address, order.secret)

    let params = this.getOrderExecutionParams(order, signature, handler)

    // Get real estimated gas
    let estimatedGas = await this.estimateGasExecution(params)
    if (!estimatedGas) {
      return
    }

    logger.debug(
      `Relayer: Estimated gas for ${order.createdTxHash} -> ${estimatedGas}`
    )

    let gasPrice = await getGasPrice()
    if (gasPrice.eq(0)) {
      gasPrice = await this.provider.getGasPrice()
    }

    let fee = await this.getFee(order, signature, handler, gasPrice.mul(estimatedGas)) // gasPrice

    // Build execution params with fee
    params = this.getOrderExecutionParams(order, signature, handler, fee)
    try {
      // simulate
      await this.pineCore.callStatic.executeOrder(
        ...params,
        {
          from: this.account.address,
          gasLimit: estimatedGas,
          gasPrice
        }
      )

      const gasito = await this.pineCore.estimateGas.executeOrder(
        ...params,
        {
          from: this.account.address,
          gasPrice
        }
      )

      logger.info(` gasito: ${gasito.toString()} and gas: ${estimatedGas.toString()}`)

      const checkedHandler = await this.getHandler(order, fee)

      if (!checkedHandler) {
        throw new Error('No handler')
      }
      //  execute
      const tx = await this.pineCore.executeOrder(
        ...params,
        {
          from: this.account.address,
          gasLimit: gasito,
          gasPrice: gasPrice
        })

      logger.info(
        `Relayer: Filled ${order.createdTxHash} order, executedTxHash: ${tx.hash}`
      )
      return tx.hash
    } catch (e) {
      logger.warn(`Relayer: Error filling order ${order.createdTxHash}: ${e.message}`)
      return undefined
    }

  }

  async estimateGasExecution(params: any, gasPrice = ethers.BigNumber.from(1)) {
    try {
      return await this.pineCore.estimateGas.executeOrder(
        ...params,
        { gasPrice }
      )
    } catch (e) {
      logger.debug(`Could not estimate gas. Error: ${e.error}`)
      return undefined
    }
  }

  async getHandler(order: Order, fee?: ethers.BigNumber): Promise<ethers.Contract | undefined> {
    let usedFee
    if (fee) {
      usedFee = fee
    } else {
      usedFee = await this.getFinalFee()
    }

    let handler: ethers.Contract | undefined
    let uniswapV1Res
    let uniswapV2Res
    try {
      uniswapV1Res = await this.uniswapV1Handler.simulate(
        order.inputToken,
        order.outputToken,
        order.inputAmount.toString(),
        order.minReturn.toString(),
        this.abiCoder.encode(['address', 'address', 'uint256'], [this.uniswapV1Handler.address, this.account.address, usedFee.toString()])
      )
    } catch (e) {
      // Do nothing
      logger.debug(`Relayer: failed to get best handler V1: ${e.message}`)
    }

    try {
      uniswapV2Res = await this.uniswapV2Handler.simulate(
        order.inputToken,
        order.outputToken,
        order.inputAmount.toString(),
        order.minReturn.toString(),
        this.abiCoder.encode(['address', 'address', 'uint256'], [this.uniswapV2Handler.address, this.account.address, usedFee.toString()])
      )
    } catch (e) {
      // Do nothing
      logger.debug(`Relayer: failed to get best handler V2: ${e.message}`)
    }

    let bought = ethers.BigNumber.from(0)
    if (uniswapV1Res && uniswapV1Res[0]) {
      logger.info(`Can be executed with uniswap v1`)
      handler = this.uniswapV1Handler
      bought = uniswapV1Res[1]
    }

    if (uniswapV2Res && uniswapV2Res[0] && bought.lte(uniswapV2Res[1])) {
      logger.info(`Can be executed with uniswap v2: ${uniswapV2Res[1].toString()}`)
      handler = this.uniswapV2Handler
    }

    return handler
  }

  getOrderExecutionParams(order: Order, signature: string, handler: ethers.Contract, fee = ethers.BigNumber.from(1)): any {
    return [
      order.module,
      order.inputToken,
      order.owner,
      this.abiCoder.encode(['address', 'uint256'], [order.outputToken, order.minReturn.toString()]),
      signature,
      this.abiCoder.encode(['address', 'address', 'uint256'], [handler.address, this.account.address, fee.toString()])
    ]
  }

  async getFee(order: Order, signature: string, handler: ethers.Contract, baseETH: ethers.BigNumber) {
    // If find best is not set, just return with base expected fee
    const fee = baseETH.add(BASE_FEE)
    if (!process.env.FIND_BEST) {
      return fee
    }

    return this.findBestFee(order, signature, handler, fee)
  }

  async findBestFee(
    order: Order,
    signature: string,
    handler: ethers.Contract,
    fee: ethers.BigNumber,
  ): Promise<ethers.BigNumber> {
    const newFee = fee.mul(ethers.BigNumber.from(1000)).div(ethers.BigNumber.from(980))

    try {
      const params = this.getOrderExecutionParams(order, signature, handler, newFee)
      await this.pineCore.callStatic.executeOrder(
        ...params
      )
      console.log(`Using a new fee: ${newFee.toString()}`)
      return this.findBestFee(order, signature, handler, newFee)
    } catch (e) {
      logger.info(`Could not increase fees anymore order with createdTxHash ${order.createdTxHash}. Error: ${e.message}`)
      return fee
    }
  }
}
