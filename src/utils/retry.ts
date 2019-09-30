import retry from 'async-retry'

import { logger } from './logger'

export function retryAsync(_async: Promise<any>, retries = 10) {
  return retry(async () => _async, {
    retries: retries,
    onRetry: err => {
      logger.warn(
        `${new Date().getTime()} - Received error ${
          err.toString().split('\n')[0]
        }`
      )
    }
  })
}
