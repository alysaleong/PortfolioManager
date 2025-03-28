## Get all friends
### req: GET http://localhost:4000/api/friends
### res:
```
[
    {
        "u1": 5,
        "email": "stupid5@stupid.com"
    },
    {
        "u2": 3,
        "email": "stupid3@stupid.com"
    },
    {
        "u2": 4,
        "email": "stupid4@stupid.com"
    }
]
```

## Get incoming friend requests
### req: GET http://localhost:4000/api/friends/requests/incoming
### res: 
```
[
    {
        "requester": 1,
        "email": "stupid@stupid.com"
    },
    {
        "requester": 2,
        "email": "stupid2@stupid.com"
    },
    {
        "requester": 3,
        "email": "stupid3@stupid.com"
    }
]
```

## Get outgoing friend requests: 
### req: http://localhost:4000/api/friends/requests/outgoing
### res: 
```
[
    {
        "requestee": 2,
        "email": "stupid2@stupid.com"
    },
    {
        "requestee": 3,
        "email": "stupid3@stupid.com"
    },
    {
        "requestee": 4,
        "email": "stupid4@stupid.com"
    }
]
```

## Send a friend request
### req: POST http://localhost:4000/api/friends/requests
```
{
    "requestee": 3
}
```
### res: 
```
{ 
    message: "Friend request sent" 
}
```

## Accept a friend request
### req: POST http://localhost:4000/api/friends/requests/accept
```
{
    "requester": 1
}
```
### res: success message

## Reject a friend request 
### req: POST http://localhost:4000/api/friends/requests/reject
```
{
    "requestee": 1
}
```
### res: success message

## Remove a friend  
### req: POST http://localhost:4000/api/friends
```
{
    "friend": 1
}
```
### res: success message
