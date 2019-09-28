# UniswapEx (Node) Relayer

## Setup

Create a `.env` file based on `.env.example`. Then, run:

```
npm install
npm run build
```

There are three main services:

* `npm run start` runs the backend thread that watches the blockchain

### contracts

Contract classes are generated automatically using [web3x](https://github.com/xf00f/web3x). Transactions are sent using the `geth` node connected to this server instance (see the `SENDER_ADDRESS` argument).
