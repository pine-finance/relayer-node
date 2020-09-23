import { JsonRpcProvider } from '@ethersproject/providers'
import dotenv from 'dotenv'
dotenv.config()

import { connectDB } from './database'
import Book from './book'
import Relayer from './relayer'
import Executor from './executor'
import { getProviderURL, getNetworkName } from './utils'

async function setupExecutor() {
  await connectDB()

  const provider = new JsonRpcProvider(getProviderURL(), getNetworkName())
  const book = new Book(provider)
  const relayer = new Relayer(provider)
  const executor = new Executor(book, relayer)

  async function watchOrders() {
    await executor.watchRound()
    setTimeout(
      watchOrders,
      Number(process.env.TIME_BETWEEN_ORDER_CHECKS) || 60000
    )
  }

  await watchOrders()
}

if (require.main === module) {
  console.log('******** Starting Executor ********')
  Promise.resolve()
    .then(() => setupExecutor())
    .catch(console.error)
}
