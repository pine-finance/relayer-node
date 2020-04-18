import 'reflect-metadata'
import { createConnection, Repository, Connection } from 'typeorm'
import { join } from 'path'
import { BN } from 'ethereumjs-util'

import { IndexerTypes } from '../utils'
import { Orders as OrderDB } from './entities/Order'
import { Indexer as IndexerDB } from './entities/Indexer'
import { Order } from '../book/types'

const parentDir = join(__dirname, '..')

let connection: Connection
let orders: Repository<OrderDB>
let indexer: Repository<IndexerDB>

export async function connectDB() {
  try {
    connection = await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_DATABASE || 'uniswapex',
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      entities: [`${parentDir}/database/entities/*.ts`],
      synchronize: true
    })
    orders = await connection.getRepository(OrderDB)
    indexer = await connection.getRepository(IndexerDB)
  } catch (e) {
    console.log('Db error', e)
    process.exit(e)
  }
}

function normalizeOrder(order: Order) {
  return {
    ...order,
    minReturn: order.minReturn.toString(),
    fee: order.fee.toString()
  }
}

function denormalizeOrder(order: any): Order {
  return {
    ...order,
    minReturn: new BN(order.minReturn),
    fee: new BN(order.fee)
  }
}

async function getOpenOrders() {
  return (await connection
    .createQueryBuilder(OrderDB, 'order')
    .select('*')
    .where('order.executedTx is NULL')
    .getRawMany()).map(denormalizeOrder)
}

async function getOrdersByTxHash(txHash: string) {
  const foundOrders = await orders.find({ txHash })
  return foundOrders.map(denormalizeOrder)
}

async function saveOrder(order: Order) {
  return orders.save(normalizeOrder(order))
}

async function existOrder(id: string) {
  const count = await orders.count({ id })
  return count > 0
}

async function saveBlock(id: IndexerTypes, block: number) {
  indexer.save({ id, block })
}

async function getLatestBlock(id: IndexerTypes): Promise<number> {
  const res = await indexer.findOne({ id })
  return res ? res.block : Number(process.env.FROM_BLOCK as string)
}

export const db = {
  getOrdersByTxHash,
  getOpenOrders,
  saveOrder,
  existOrder,
  saveBlock,
  getLatestBlock
}
