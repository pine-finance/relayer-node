import { EventLog } from 'web3/types'

export function buildId(event: EventLog) {
  return `${event.blockNumber}-${event.logIndex}`
}