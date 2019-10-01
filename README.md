# UniswapEx (Node) Relayer

## Setup

### Env variables

Create a `.env` file based on `.env.example`. Then, run:

### Install dependencies

```
npm install
```

### DB

Create a database (default name `uniswapex`)

```sql
CREATE DATABASE uniswapex
```

You can use postgress directly or pgadmin.

## Run

### Index Uniswap's tokens

- `npm run indexer` Index uniswap token's orders

### Index Most used tokens

- `npm run indexer:most-used` Index most used token's orders

Tokens can be changed [here](https://github.com/UniswapEx/relayer-node/blob/master/src/utils/tokens.ts).

### Execute indexed orders

- `npm run executor` Execute orders when can be filled
