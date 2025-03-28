## Create a stocklist
### req: http://localhost:4000/api/stocklists
```
{
    "slname": "My Stock List", // optional
    "is_public": false // optional
}
```
### res: success message

## Add stocks to list 
### req: http://localhost:4000/api/stocklists/:slid
```
{
    "symbol": "POO",
    "quantity": 8
}
```
### res: succes message