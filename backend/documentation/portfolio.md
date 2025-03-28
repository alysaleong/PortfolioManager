### Create portfolio
#### req: POST http://localhost:4000/api/portfolio
#### res: `{"message": "Portfolio created"}`

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
        "quantity": 100
    },
    {
        "symbol": "O",
        "quantity": 25
    }
]
```