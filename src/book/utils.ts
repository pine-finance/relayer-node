import { EventLog } from 'web3/types'

export const ORDER_BYTES_LENGTH = 448

export function buildId(event: EventLog) {
  return `${event.blockNumber}-${event.logIndex}`
}
