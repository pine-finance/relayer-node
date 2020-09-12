import { ethers } from 'ethers'
import { Contract } from '@ethersproject/contracts'

import Relayer from './Relayer'
import { logger, getGasPrice } from '../utils'
import { Order } from '../book/types'
import { ONEINCH_HANDLER_ADDRESSES, ETH_ADDRESS } from '../contracts'
import HandlerABI from '../contracts/abis/Handler.json'

export default class OneInchRelayer {
  base: Relayer
  oneInchHandler: Contract

  constructor(base: Relayer) {
    this.base = base

    this.oneInchHandler = new Contract(
      ONEINCH_HANDLER_ADDRESSES[base.chainId],
      HandlerABI,
      base.account
    )
  }

  async execute(order: Order): Promise<string | undefined> {
    const parts = 10
    const ABI = [{ "inputs": [{ "internalType": "contract IOneSplitMulti", "name": "impl", "type": "address" }], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "newImpl", "type": "address" }], "name": "ImplementationUpdated", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "contract IERC20", "name": "fromToken", "type": "address" }, { "indexed": true, "internalType": "contract IERC20", "name": "destToken", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "fromTokenAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "destTokenAmount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "minReturn", "type": "uint256" }, { "indexed": false, "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }, { "indexed": false, "internalType": "uint256[]", "name": "flags", "type": "uint256[]" }, { "indexed": false, "internalType": "address", "name": "referral", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "feePercent", "type": "uint256" }], "name": "Swapped", "type": "event" }, { "payable": true, "stateMutability": "payable", "type": "fallback" }, { "constant": true, "inputs": [], "name": "chi", "outputs": [{ "internalType": "contract IFreeFromUpTo", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "contract IERC20", "name": "asset", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "claimAsset", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "contract IERC20", "name": "fromToken", "type": "address" }, { "internalType": "contract IERC20", "name": "destToken", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "parts", "type": "uint256" }, { "internalType": "uint256", "name": "flags", "type": "uint256" }], "name": "getExpectedReturn", "outputs": [{ "internalType": "uint256", "name": "returnAmount", "type": "uint256" }, { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "contract IERC20", "name": "fromToken", "type": "address" }, { "internalType": "contract IERC20", "name": "destToken", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "parts", "type": "uint256" }, { "internalType": "uint256", "name": "flags", "type": "uint256" }, { "internalType": "uint256", "name": "destTokenEthPriceTimesGasPrice", "type": "uint256" }], "name": "getExpectedReturnWithGas", "outputs": [{ "internalType": "uint256", "name": "returnAmount", "type": "uint256" }, { "internalType": "uint256", "name": "estimateGasAmount", "type": "uint256" }, { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [{ "internalType": "contract IERC20[]", "name": "tokens", "type": "address[]" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256[]", "name": "parts", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "flags", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "destTokenEthPriceTimesGasPrices", "type": "uint256[]" }], "name": "getExpectedReturnWithGasMulti", "outputs": [{ "internalType": "uint256[]", "name": "returnAmounts", "type": "uint256[]" }, { "internalType": "uint256", "name": "estimateGasAmount", "type": "uint256" }, { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "isOwner", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "oneSplitImpl", "outputs": [{ "internalType": "contract IOneSplitMulti", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": false, "inputs": [], "name": "renounceOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "contract IOneSplitMulti", "name": "impl", "type": "address" }], "name": "setNewImpl", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "contract IERC20", "name": "fromToken", "type": "address" }, { "internalType": "contract IERC20", "name": "destToken", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "minReturn", "type": "uint256" }, { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }, { "internalType": "uint256", "name": "flags", "type": "uint256" }], "name": "swap", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "contract IERC20[]", "name": "tokens", "type": "address[]" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "minReturn", "type": "uint256" }, { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "flags", "type": "uint256[]" }], "name": "swapMulti", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "contract IERC20", "name": "fromToken", "type": "address" }, { "internalType": "contract IERC20", "name": "destToken", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "minReturn", "type": "uint256" }, { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }, { "internalType": "uint256", "name": "flags", "type": "uint256" }, { "internalType": "address", "name": "referral", "type": "address" }, { "internalType": "uint256", "name": "feePercent", "type": "uint256" }], "name": "swapWithReferral", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "contract IERC20[]", "name": "tokens", "type": "address[]" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }, { "internalType": "uint256", "name": "minReturn", "type": "uint256" }, { "internalType": "uint256[]", "name": "distribution", "type": "uint256[]" }, { "internalType": "uint256[]", "name": "flags", "type": "uint256[]" }, { "internalType": "address", "name": "referral", "type": "address" }, { "internalType": "uint256", "name": "feePercent", "type": "uint256" }], "name": "swapWithReferralMulti", "outputs": [{ "internalType": "uint256", "name": "returnAmount", "type": "uint256" }], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }]
    const CONTRACT_ADDRESS = "0xC586BeF4a0992C495Cf22e1aeEE4E446CECDee0E"
    const contract = new Contract(CONTRACT_ADDRESS, ABI, this.base.account)
    const splitExchanges = [
      "Uniswap", "Kyber", "Bancor", "Oasis", "CurveCompound", "CurveUsdt", "CurveY", "CurveBinance", "CurveSynthetix", "UniswapCompound", "UniswapChai", "UniswapAave", "Mooniswap", "UniswapV2", "UniswapV2ETH", "UniswapV2DAI", "UniswapV2USDC", "CurvePax", "CurveRenBtc", "CurveTBtc", "DforceSwap", "Shellexchangers"
    ]
    try {
      // Get handler to use
      const handler = this.oneInchHandler
      let distributionsA = []
      let distributionsB = []
      let expectedOut

      const isTokenToToken = order.inputToken !== ETH_ADDRESS && order.outputToken !== ETH_ADDRESS

      if (isTokenToToken) {
        let data = await contract.getExpectedReturn(
          order.inputToken,
          ETH_ADDRESS,
          order.inputAmount.toString(),
          parts,
          0
        )

        data.distribution.forEach(function (value: any, index: any) {
          if (value > 0) {
            logger.info(`${splitExchanges[index]}: ${value * 100 / parts}%`)
          }
        })

        distributionsA = data.distribution

        data = await contract.getExpectedReturn(
          ETH_ADDRESS,
          order.outputToken,
          data.returnAmount.toString(),
          parts,
          0
        )

        data.distribution.forEach(function (value: any, index: any) {
          if (value > 0) {
            logger.info(`${splitExchanges[index]}: ${value * 100 / parts}%`)
          }
        })

        distributionsB = data.distribution

        expectedOut = data.returnAmount
      } else {
        const data = await contract.getExpectedReturn(
          order.inputToken,
          order.outputToken,
          order.inputAmount.toString(),
          parts,
          0
        )

        data.distribution.forEach(function (value: any, index: any) {
          if (value > 0) {
            logger.info(`${splitExchanges[index]}: ${value * 100 / parts}%`)
          }
        })

        distributionsA = data.distribution
        expectedOut = data.returnAmount
      }

      const ratio = expectedOut.toString() / parseInt(order.minReturn.toString())


      logger.info(`${order.inputToken} -> ${order.outputToken}`)
      logger.info(`Can buy ${expectedOut.toString()} / ${order.minReturn.toString()} => ${ratio}% `)

      if (ratio < 1) {
        return
      }

      let params = this.getOrderExecutionParams(order, handler, distributionsA, distributionsB)

      // Get real estimated gas
      let estimatedGas = await this.estimateGasExecution(params)
      if (!estimatedGas) {
        return
      }

      let gasPrice = await getGasPrice()
      if (gasPrice.eq(0)) {
        gasPrice = await this.base.provider.getGasPrice()
      }

      let fee = this.base.getFee(gasPrice.mul(estimatedGas)) // gasPrice

      // Build execution params with fee
      params = this.getOrderExecutionParams(order, handler, distributionsA, distributionsB, fee)

      // simulate
      await this.base.pineCore.callStatic.executeOrder(
        ...params,
        {
          from: this.base.account.address,
          gasLimit: estimatedGas.add(ethers.BigNumber.from(50000)),
          gasPrice
        }
      )

      const isOrderOpen = await this.base.existOrder(order)
      if (!isOrderOpen) {
        return undefined
      }

      logger.info(`1inch: can be executed: ${order.createdTxHash}`)

      // execute
      const tx = await this.base.pineCore.executeOrder(
        ...params,
        {
          from: this.base.account.address,
          gasLimit: estimatedGas.add(ethers.BigNumber.from(50000)),
          gasPrice: gasPrice
        })

      logger.info(
        `Relayer: Filled ${order.createdTxHash} order, executedTxHash: ${tx.hash}`
      )
      return tx.hash
    } catch (e) {
      console.log(`Relayer: Error filling order ${order.createdTxHash}: ${e.error ?? e.message}`)
      return undefined

    }
  }

  getOrderExecutionParams(order: Order, handler: ethers.Contract, distributionsA: number[], distributionsB: number[], fee = ethers.BigNumber.from(1)): any[] {
    return [
      order.module,
      order.inputToken,
      order.owner,
      this.base.abiCoder.encode(['address', 'uint256'], [order.outputToken, order.minReturn.toString()]),
      order.signature,
      this.base.abiCoder.encode(
        ['address', 'address', 'uint256', 'uint256', 'uint256[]', 'uint256[]'],
        [handler.address, this.base.account.address, fee, 0, distributionsA, distributionsB]
      )
    ]
  }

  async estimateGasExecution(params: any, gasPrice = ethers.BigNumber.from(1)) {
    try {
      return await this.base.pineCore.estimateGas.executeOrder(
        ...params,
        { gasPrice }
      )
    } catch (e) {
      logger.debug(`Could not estimate gas.Error: ${e.error}`)
      return undefined
    }
  }
}
