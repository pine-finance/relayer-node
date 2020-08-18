import { JsonRpcProvider } from '@ethersproject/providers'
import dotenv from 'dotenv'
dotenv.config()


import { connectDB } from './database'
import Book from './book'
import Relayer from './relayer'
import Executor from './executor'


async function setupExecutor() {
  await connectDB()

  const provider = new JsonRpcProvider(process.env.HTTP_RPC_URL, process.env.NETWORK)
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
