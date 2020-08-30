# Pine Finance (Node) Relayer

## Setup

### Env variables

Create a `.env` file based on `.env.example`. Then, run:

### Install dependencies

```
npm install
```

### DB

Create a database. Network will be added at the end. E.g: `pine_mainnet`; `pine_rinkeby`; etc.

```sql
CREATE DATABASE pine_mainnet
```

You can use postgress directly or pgadmin.

## Run

### Index Orders

- `npm run indexer:mainnet` Index uniswap token's orders

### Execute indexed orders

- `npm run executor:mainnet` Execute orders when can be filled
