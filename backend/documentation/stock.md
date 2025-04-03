### Input current stock information for a new or already existing stock
#### req: POST http://localhost:4000/api/portfolios/stock
#### res: `{message: "Stock inserted"}`

### Input historical stock data
#### req: POST http://localhost:4000/api/portfolios/stock/hist
#### res: `{message: "Data inserted"}`

### Display stock information for a given stock from given time interval
#### req: POST http://localhost:4000/api/stocks/:symbol
#### res:
```
[
    {
        "timestamp": "2025-03-27T04:00:00.000Z",
        "price": "3.59"
    },
    {
        "timestamp": "2025-03-29T04:00:00.000Z",
        "price": "420.69"
    },
    {
        "timestamp": "2025-03-28T04:00:00.000Z",
        "price": "3.5"
    }
]
```

### Compute COV of the given stock for the given time interval
#### req: POST http://localhost:4000/api/stocks/symbol/:symbol/cov
#### res:
```
[
    {
        "cov": "0.00640617433114275665"
    }
]
```

### Compute Beta coefficient of the given stock for the given time interval
#### req: POST http://localhost:4000/api/stocks/symbol/:symbol/beta
#### res:
```
[
    {
        "beta": 9.093142870299663e-16
    }
]
```

### Compute covariance of the given stocks for the given time interval
#### req: POST http://localhost:4000/api/stocks/cov
#### res:
```
[
    {
        "cov": -1.1132959633540298e-15
    }
]
```