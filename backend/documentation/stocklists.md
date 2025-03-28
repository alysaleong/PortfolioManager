## Create a stocklist
### req: POST http://localhost:4000/api/stocklists
```
{
    "slname": "My Stock List", // optional
    "is_public": false // optional
}
```
### res: success message

## Set visiblity of stock list
### req: PATCH http://localhost:4000/api/stocklists/:slid
```
{
    "is_public": true
}
```
### res: success message

## Add stocks to list 
### req: POST http://localhost:4000/api/stocklists/:slid
```
{
    "symbol": "POO",
    "quantity": 8
}
```
### res: success message

## Remove stock from stock list
### req: DELETE http://localhost:4000/api/stocklists/:slid
```
{
    "symbol": "POO"
}
```
### res: success message