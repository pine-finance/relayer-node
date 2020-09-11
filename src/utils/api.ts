import { Order } from '../book/types'

export const ORDER_GRAPH = {
  1: 'https://api.thegraph.com/subgraphs/name/pine-finance/pine_orders',
  4: 'https://api.thegraph.com/subgraphs/name/pine-finance/pine_orders_rinkeby'
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

  async getOpenOrdersBetweenBlock(fromBlock: number, toBlock: number): Promise<Order[]> {
    const query = `
      query getOrdersFromBlock($fromBlock: BigInt, $toBlock: BigInt) {
        orders(where:{blockNumber_gte:$fromBlock,blockNumber_lte:$toBlock,status:open}) {
          id
          inputToken
          outputToken
          minReturn
          owner
          secret
          witness
          module
          inputAmount
          createdTxHash
        }
      }`

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { fromBlock: fromBlock - 40, toBlock } }) // Get some from re-orgs
      })

      const { data } = await res.json()
      return data.orders
    } catch (e) {
      throw new Error(`API: Error getting orders at getOpenOrdersFromBlock: ${e.message}`)
    }
  }

  async getCancelledOrders(ids: string[]): Promise<string[]> {
    const query = `
      query getOrdersCancelled($ids: [String]) {
        orders(where:{id_in:$ids, status_not: open}) {
          id
        }
      }`

    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { ids } })
      })

      const { data } = await res.json()

      console.log(data)

      return data.orders.map((o: any) => o.id)
    } catch (e) {
      console.log(e.message)
      throw new Error(`API: Error getting order at isOrderStillOpen: ${e.message}`)
    }
  }




}

export const api = new API()