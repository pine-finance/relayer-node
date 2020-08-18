import { ethers } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import { Contract } from '@ethersproject/contracts'
import { joinSignature } from '@ethersproject/bytes'


import { Order } from '../book/types'
import uniswapexV2BI from '../contracts/abis/UniswapexV2.json'
import uniswapexV1HandlerABI from '../contracts/abis/UniswapV1Handler.json'
import uniswapexV2HandlerABI from '../contracts/abis/UniswapV2Handler.json'
import { UNISWAPEX_ADDRESSES, UNISWAP_V1_HANDLER_ADDRESSES, UNISWAP_V2_HANDLER_ADDRESSES } from '../contracts'

import { logger, getGasPrice } from '../utils'

const FEE = ethers.BigNumber.from(1000000000000000)


export default class Relayer {
  provider: JsonRpcProvider
  uniswapex: Contract
  uniswapexV1Handler: Contract
  uniswapexV2Handler: Contract
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

    this.uniswapex = new Contract(
      (UNISWAPEX_ADDRESSES as any)[CHAIN_ID || 1],
      uniswapexV2BI,
      account
    )

    this.uniswapexV1Handler = new Contract(
      (UNISWAP_V1_HANDLER_ADDRESSES as any)[CHAIN_ID || 1],
      uniswapexV1HandlerABI as any,
      account
    )

    this.uniswapexV2Handler = new Contract(
      (UNISWAP_V2_HANDLER_ADDRESSES as any)[CHAIN_ID || 1],
      uniswapexV2HandlerABI as any,
      account
    )
  }

  async isReady(order: Order): Promise<boolean> {
    let ready

    try {
      ready = await this.uniswapex.canExecuteOrder(
        order.module,
        order.fromToken,
        order.owner,
        order.witness,
        this.abiCoder.encode(['address', 'uint256'], [order.toToken, order.minReturn.toString()]),
        this.abiCoder.encode(['address', 'address', 'uint256'], [this.uniswapexV2Handler.address, this.account.address, FEE]),
        { from: this.account.address }
      )

      if (!ready) {
        await this.uniswapex.canExecuteOrder(
          order.module,
          order.fromToken,
          order.owner,
          order.witness,
          this.abiCoder.encode(['address', 'uint256'], [order.toToken, order.minReturn.toString()]),
          this.abiCoder.encode(['address', 'address', 'uint256'], [this.uniswapexV1Handler.address, this.account.address, FEE]),
          { from: this.account.address }
        )
      }

    } catch (e) {
      logger.debug(`Relayer: Failed at canExecuteOrder for ${order.createdTxHash}: ${e.message} ${e.stack}`)
    }
    logger.debug(`Relayer: Order ${order.createdTxHash} is${ready ? '' : ' not'} ready`)

    return ready
  }


  async canExecute(order: Order): Promise<boolean> {
    return ((await this.isReady(order)))
  }

  async sign(address: string, priv: string): Promise<string> {
    const hash = ethers.utils.solidityKeccak256(['address'], [address])

    const wallet = new Wallet(priv)

    // Unsafe as fuck, but not for this.
    return joinSignature(wallet._signingKey().signDigest(hash))
  }

  async fillOrder(order: Order): Promise<string | undefined> {
    let gasPrice = await getGasPrice()

    if (gasPrice.eq(0)) {
      gasPrice = await this.provider.getGasPrice()
    }

    logger.debug(`Relayer: Loaded gas price for ${order.createdTxHash} -> ${gasPrice}`)

    const witnesses = await this.sign(this.account.address, order.secret)

    logger.debug(`Relayer: Witnesses for ${order.createdTxHash} -> ${witnesses}`)

    let estimatedGas = ethers.BigNumber.from(0)
    const params = [
      order.module,
      order.fromToken,
      order.owner,
      this.abiCoder.encode(['address', 'uint256'], [order.toToken, order.minReturn.toString()]),
      witnesses,
      this.abiCoder.encode(['address', 'address', 'uint256'], [this.uniswapexV2Handler.address, this.account.address, FEE])
    ]
    try {
      estimatedGas = await this.uniswapex.estimateGas.executeOrder(
        ...params
      )
    } catch (e) {
      logger.info(`Could not estimate gas for order with createdTxHash ${order.createdTxHash}. Error: ${e.message}`)
      return undefined

    }

    logger.debug(
      `Relayer: Estimated gas for ${order.createdTxHash} -> ${estimatedGas}`
    )

    if (gasPrice.mul(estimatedGas).gt(FEE)) {
      gasPrice = await this.provider.getGasPrice()
      if (gasPrice.mul(estimatedGas).gt(FEE)) {
        // Fee is too low
        logger.info(
          `Relayer: Skip, fee is not enought ${order.createdTxHash} cost: ${gasPrice.mul(estimatedGas).toString()}`
        )
        return undefined
      }
    }

    try {
      const txHash = await this.uniswapex.executeOrder(
        ...params,
        {
          from: this.account.address,
          gas: estimatedGas,
          gasPrice: gasPrice
        })

      logger.info(
        `Relayer: Filled ${order.createdTxHash} order, executedTxHash: ${txHash}`
      )
      return txHash
    } catch (e) {
      logger.warn(`Relayer: Error filling order ${order.createdTxHash}: ${e.message}`)
      return undefined
    }
  }
}
