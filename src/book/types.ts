import { BigNumber } from 'ethers'

export type Order = {
  id: string
  module: string
  fromToken: string
  toToken: string
  minReturn: BigNumber
  amount: BigNumber
  owner: string
  secret: string
  witness: string
  createdTxHash: string
  executedTxHash?: string | null
}
