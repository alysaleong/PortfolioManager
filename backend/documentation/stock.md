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

### Compute future stock prices given the future date
#### req: POST http://localhost:4000/api/stocks/symbol/AAPL/future
#### res:
```
[
    {
        "timestamp": "2025-04-12",
        "price": 111.16495393967776
    },
    {
        "timestamp": "2025-04-13",
        "price": 111.16780228672096
    },
    {
        "timestamp": "2025-04-14",
        "price": 111.17065063376418
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

