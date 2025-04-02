### Create portfolio
#### req: POST http://localhost:4000/api/portfolio
#### res: `{message: "Portfolio created"}`

### Display user's portfolios
#### req: GET http://localhost:4000/api/portfolio
#### res:
```
[
    {
        "pid": 3,
        "pname": "poopoo"
    },
    {
        "pid": 4,
        "pname": ""
    },
    {
        "pid": 6,
        "pname": "My Portfolio"
    }
]
```

### Display stock holdings of a given portfolio
#### req: GET http://localhost:4000/api/portfolios/:pid
#### res:
```
[
    {
        "symbol": "ABC",
        "quantity": 110,
        "total_value": "10364.20"
    },
    {
        "symbol": "VFC",
        "quantity": 100,
        "total_value": "8047.00"
    },
    {
        "symbol": "COG",
        "quantity": 10,
        "total_value": "233.70"
    },
    {
        "symbol": "O",
        "quantity": 25,
        "total_value": "1223.00"
    },
    {
        "symbol": "POO",
        "quantity": 0,
        "total_value": "0.00"
    }
]
```

### Make a deposit
#### req: POST http://localhost:4000/api/portfolios/deposit
#### res: `{message: `\$${deposit} deposited`}`

### Purchase a stock of a given portfolio, stock symbol, and quantity
#### req: POST http://localhost:4000/api/portfolios/buy
#### res: `{message: `${symbol} purchased for \$${total_price}`}`

### Sell a stock of a given portfolio, stock symbol, and quantity
#### req: POST http://localhost:4000/api/portfolios/sell
#### res: `{message: `${symbol} sold for \$${total_price}`}`
