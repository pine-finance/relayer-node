export type Order = {
  fromToken: string
  toToken: string
  minReturn: number
  fee: number
  owner: string
  secret: string
  witness: string
  txHash: string
}
