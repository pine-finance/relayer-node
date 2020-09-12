import { BigNumber } from 'ethers'

export type Order = {
  id: string
  module: string
  inputToken: string
  outputToken: string
  minReturn: BigNumber
  inputAmount: BigNumber
  owner: string
  secret: string
  witness: string
  signature: string
  createdTxHash: string
  executedTxHash?: string | null
}
