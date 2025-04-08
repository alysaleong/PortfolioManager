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
#### req: GET http://localhost:4000/api/portfolios/pid/:pid
#### res:
```
[
    {
        "symbol": "Portfolio Total",
        "quantity": "245",
        "total_value": "19867.90"
    },
    {
        "symbol": "O",
        "quantity": "25",
        "total_value": "1223.00"
    },
    {
        "symbol": "VFC",
        "quantity": "100",
        "total_value": "8047.00"
    },
    {
        "symbol": "ABC",
        "quantity": "110",
        "total_value": "10364.20"
    },
    {
        "symbol": "COG",
        "quantity": "10",
        "total_value": "233.70"
    }
]
```

### Make a deposit
#### req: POST http://localhost:4000/api/portfolios/deposit
#### res: `{message: `\$${deposit} deposited`}`

### Withdraw from cash account
#### req: POST http://localhost:4000/api/portfolios/withdraw
#### res: `{message: `\$${withdrawal} withdrew`}`

### Transfer cash between given portfolios
#### req: POST http://localhost:4000/api/portfolios/transfer
#### res: `{message: "Cash successfully transferred"}`

### Display stocks bought
#### req: GET http://localhost:4000/api/portfolios/bought/:pid
#### res: 
```
[
    {
        "symbol": "POO",
        "timestamp": "2025-03-31T04:00:00.000Z",
        "total_value": "420.69"
    }
]
```

### Display stocks sold
#### req: GET http://localhost:4000/api/portfolios/sold/:pid
#### res:
```
[
    {
        "symbol": "POO",
        "timestamp": "2025-03-31T04:00:00.000Z",
        "total_value": "420.69"
    }
]
```

### Purchase a stock of a given portfolio, stock symbol, and quantity
#### req: POST http://localhost:4000/api/portfolios/buy
#### res: `{message: `${symbol} purchased for \$${total_price}`}`

### Sell a stock of a given portfolio, stock symbol, and quantity
#### req: POST http://localhost:4000/api/portfolios/sell
#### res: `{message: `${symbol} sold for \$${total_price}`}`

### Compute covariance matrix for the stocks of a given portfolio and time interval
#### req: POST http://localhost:4000/api/portfolios/cov
#### res: 
```
[
    [
        [
            1.8471096947738253,
            "PFE",
            "PFE"
        ],
        [
            -2.1891395222146528e-13,
            "PFE",
            "LEG"
        ]
    ],
    [
        [
            -2.1891395222146528e-13,
            "LEG",
            "PFE"
        ],
        [
            1.861504743083004,
            "LEG",
            "LEG"
        ]
    ]
]
```
