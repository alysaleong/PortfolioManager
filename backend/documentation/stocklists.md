# Stock lists
## Get stock list
### req: GET http://localhost:4000/api/stocklists
### res: 
```json
[
    {
        "slid": 5,
        "slname": "My Stock List",
        "public": false
    },
    {
        "slid": 7,
        "slname": "ALYSA",
        "public": true
    },
    {
        "slid": 4,
        "slname": "My Stock List",
        "public": true
    }
]
```


## Create a stocklist
### req: POST http://localhost:4000/api/stocklists
```json
{
    "slname": "My Stock List", // optional
    "is_public": false // optional
}
```
### res: success message

## Set visiblity of stock list
### req: PATCH http://localhost:4000/api/stocklists/:slid
```json
{
    "is_public": true
}
```
### res: success message

## Delete stocklist
### req: DELETE http://localhost:4000/api/stocklists/:slid
### res: success message


# Stocks in Stock List
## Get a stock list 
### req: GET http://localhost:4000/api/stocklists/:slid
### res: 
```json
{
    "slid": 4,
    "slname": "My Stock List",
    "public": true,
    "uid": 2,
    "stocks": [
        {
            "symbol": "ABC",
            "quantity": 6,
            "curr_val": "94.22",
            "total_value": "565.32"
        },
        {
            "symbol": "O",
            "quantity": 7,
            "curr_val": "48.92",
            "total_value": "342.44"
        },
        {
            "symbol": "POO",
            "quantity": 100,
            "curr_val": "420.69",
            "total_value": "42069.00"
        }
    ]
}
```

## Add stocks to list 
### req: POST http://localhost:4000/api/stocklists/:slid/stocks
```json
{
    "symbol": "POO",
    "quantity": 8
}
```
### res: success message

## Remove stock from stock list
### req: DELETE http://localhost:4000/api/stocklists/:slid/stocks
```json
{
    "symbol": "POO",
    "quantity": 70 // optional, if not included or greater than quantity, it will delete the stock 
}
```
### res: success message