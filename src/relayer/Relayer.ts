import Web3 from 'web3'
import eutils from 'ethereumjs-util'
import Contract from 'web3/eth/contract'
import { Account } from 'web3/eth/accounts'

import { Order } from '../book/types'
import { uniswapexABI } from '../contracts'
import { logger } from '../utils'

export default class Relayer {
  w3: Web3
  uniswapex: Contract
  account: Account

  constructor(web3: Web3) {
    const { UNISWAPEX_CONTRACT, SENDER_ADDRESS, SENDER_PRIVKEY } = process.env
    this.w3 = web3
    this.uniswapex = new web3.eth.Contract(uniswapexABI, UNISWAPEX_CONTRACT)

    const privateKey =
      SENDER_PRIVKEY && SENDER_PRIVKEY.startsWith('0x')
        ? SENDER_PRIVKEY
        : `0x${SENDER_PRIVKEY}`

    const account = web3.eth.accounts.privateKeyToAccount(privateKey)
    web3.eth.accounts.wallet.add(account)

    if (SENDER_ADDRESS !== account.address) {
      throw new Error('Expected public key does not correspond to the private')
    }
    logger.info(`Relayer: Using account ${account.address}`)
    this.account = account
  }

  sign(address: string, priv: string): string {
    const hash = this.w3.utils.soliditySha3({ t: 'address', v: address })
    const sig = eutils.ecsign(eutils.toBuffer(hash), eutils.toBuffer(priv))

    return eutils.bufferToHex(
      Buffer.concat([sig.r, sig.s, eutils.toBuffer(sig.v)])
    )
  }

  async fillOrder(order: Order): Promise<string | undefined> {
    const gasPrice = await this.w3.eth.getGasPrice()

    logger.debug(`Relayer: Loaded gas price for ${order.txHash} -> ${gasPrice}`)

    const witnesses = this.sign(this.account.address, order.secret)

    logger.debug(`Relayer: Witnesses for ${order.txHash} -> ${witnesses}`)

    const estimatedGas = await this.uniswapex.methods
      .executeOrder(
        order.fromToken,
        order.toToken,
        order.minReturn.toString(),
        order.fee.toString(),
        order.owner,
        witnesses
      )
      .estimateGas({ from: this.account.address })

    logger.debug(
      `Relayer: Estimated gas for ${order.txHash} -> ${estimatedGas}`
    )

    if (gasPrice * estimatedGas > order.fee) {
      // Fee is too low
      logger.verbose(
        `Relayer: Skip, fee is not enought ${order.txHash} cost: ${gasPrice *
          estimatedGas}`
      )
      return undefined
    }

    try {
      const tx = await this.uniswapex.methods
        .executeOrder(
          order.fromToken,
          order.toToken,
          order.minReturn,
          order.fee,
          order.owner,
          witnesses
        )
        .send({
          from: this.account.address,
          gas: estimatedGas,
          gasPrice: gasPrice
        })

      logger.info(
        `Relayer: Filled ${order.txHash} order, txHash: ${tx.transactionHash}`
      )
      return tx.transactionHash
    } catch (e) {
      logger.warn(`Relayer: Error filling order ${order.txHash}: ${e.message}`)
      return undefined
    }
  }
}
