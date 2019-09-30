import { BN } from 'ethereumjs-util'

export type Order = {
  id: string
  fromToken: string
  toToken: string
  minReturn: BN
  fee: BN
  owner: string
  secret: string
  witness: string
  txHash: string
  executedTx?: string
}
