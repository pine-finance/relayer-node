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

- `npm run start` runs the backend thread that watches the blockchain and index orders
