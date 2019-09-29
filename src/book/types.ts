export type Order = {
  id: string
  fromToken: string
  toToken: string
  minReturn: number
  fee: number
  owner: string
  secret: string
  witness: string
  txHash: string
  executedTx?: string
}
