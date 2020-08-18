import { Order } from '../book/types'

export const ORDER_GRAPH = {
  1: 'https://api.thegraph.com/subgraphs/name/uniswapex/uniswapex_orders',
  4: 'https://api.thegraph.com/subgraphs/name/uniswapex/uniswapex_orders_rinkeby'
}

class API {
  url: string
  constructor() {
    const url: string = (ORDER_GRAPH as any)[process.env.CHAIN_ID || 1]

    if (!url) {
      throw new Error(`No URL for the passed chain id: ${process.env.CHAIN_ID}`)
    }

    this.url = url
  }

  async getOpenOrdersFromBlock(fromBlock: number): Promise<Order[]> {
    const query = `
      query getOrdersFromBlock($fromBlock: BigInt) {
        orders(where:{blockNumber_gte:$fromBlock,status:open}) {
          id
          fromToken
          toToken
          minReturn
          owner
          secret
          witness
          module
          amount
          createdTxHash
        }
      }`

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { fromBlock: fromBlock - fromBlock } })
      })

      const { data } = await res.json()
      return data.orders
    } catch (e) {
      throw new Error(`API: Error getting orders at getOpenOrdersFromBlock: ${e.message}`)
    }
  }

  async isOrderStillOpen(id: string): Promise<boolean> {
    const query = `
      query getOrdersStatus($id: String) {
        orders(where:{id:$id}) {
          status
        }
      }`

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { id } })
      })

      const { data } = await res.json()

      return data.orders && data.orders.length === 1 && data.orders[0].status === 'open'
    } catch (e) {
      console.log(e.message)
      throw new Error(`API: Error getting order at isOrderStillOpen: ${e.message}`)
    }
  }




}

export const api = new API()