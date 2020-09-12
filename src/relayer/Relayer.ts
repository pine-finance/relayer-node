import { ethers } from 'ethers'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Wallet } from '@ethersproject/wallet'
import { Contract } from '@ethersproject/contracts'
import { joinSignature } from '@ethersproject/bytes'

import OneInchRelayer from './OneInchRelayer'
import UniswapV2Relayer from './UniswapV2Relayer'
import BalancerRelayer from './BalancerRelayer'
import { db } from '../database'
import { logger } from '../utils'
import { Order } from '../book/types'
import pineCoreBI from '../contracts/abis/PineCore.json'
import { PINE_CORE_ADDRESSES, } from '../contracts'

const BASE_FEE = ethers.BigNumber.from('10000000000000000') // 0,01 eth

export default class Relayer {
  provider: JsonRpcProvider
  pineCore: Contract
  chainId: number
  account: Wallet
  abiCoder: ethers.utils.AbiCoder
  uniswapV2Relayer: UniswapV2Relayer
  oneInchRelayer: OneInchRelayer
  balancerRelayer: BalancerRelayer

  constructor(provider: JsonRpcProvider) {
    const { CHAIN_ID, SENDER_ADDRESS, SENDER_PRIVKEY } = process.env

    this.provider = provider
    this.abiCoder = new ethers.utils.AbiCoder()
    this.chainId = Number(CHAIN_ID || 1)

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
      PINE_CORE_ADDRESSES[this.chainId],
      pineCoreBI,
      account
    )

    this.oneInchRelayer = new OneInchRelayer(this)
    this.uniswapV2Relayer = new UniswapV2Relayer(this)
    this.balancerRelayer = new BalancerRelayer(this)
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
    const handler = process.env.HANDLER

    if (!order.signature) {
      const signature = await this.sign(this.account.address, order.secret)
      await db.saveOrder({ ...order, signature })
      order.signature = signature
    }

    if (handler === 'balancer') {
      return this.balancerRelayer.execute(order)
    } else if (handler === '1Inch') {
      return this.oneInchRelayer.execute(order)
    } else {
      return this.uniswapV2Relayer.execute(order)
    }
  }

  async existOrder(order: Order): Promise<boolean> {
    const isOrderOpen = await db.getOrdersByTxHash(order.createdTxHash)
    if (isOrderOpen[0].executedTxHash) {
      logger.info(`Order ${isOrderOpen[0].createdTxHash} was executed: ${isOrderOpen[0].executedTxHash}`)
      return false
    }
    return true
  }

  async estimateGasExecution(params: any[], gasPrice = ethers.BigNumber.from(1)) {
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

  getFee(baseETH: ethers.BigNumber): ethers.BigNumber {
    // If find best is not set, just return with base expected fee
    const fee = baseETH.add(BASE_FEE)
    return fee
  }
}
