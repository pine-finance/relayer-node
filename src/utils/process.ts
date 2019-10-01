
export enum IndexerTypes {
  ALL_TOKENS = 0,
  MOST_USED = 1
}

export function getIndexerId() {
  return process.env.MOST_USED && process.env.MOST_USED.length ? IndexerTypes.MOST_USED : IndexerTypes.ALL_TOKENS
}