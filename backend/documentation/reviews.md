## Get all the reviews for a stock list
### req: GET http://localhost:4000/api/reviews/:slid
### res: 
```json
[
    {
        "uid": 2,
        "review": "this is a great list man public"
    },
    {
        "uid": 5,
        "review": ""
    }
]
```
- only the owner can get all reviews if its a private list
- if its public, anyone can get all reviews

## Get review for stocklist written by some user
### req: GET http://localhost:4000/api/reviews/:slid/users/:reviewer_uid
### res: 
```json
{
    "uid": 5,
    "review": "this is a great list man"
}
```
- owner can get all reviews of their stock lists 
- if public stock list, anyone can see reviews for it
- error if that user doesnt have a review 

## Create a review for a public stock list
### req: POST http://localhost:4000/api/reviews/:slid 
```json
{
    "review": "this is a great list man public"
}
```
### res: success message
- if the review already exist or the stock list isnt public, this fails

## Edit a review for a stocklist you were invited to/started writing
### req: PATCH http://localhost:4000/api/reviews/:slid
```json
{
    "review": "this is a great list man"
}
```
### res: success message
- if the review doesnt already exist, this doesnt work


## Invite friend to review stocklist
### req: POST http://localhost:4000/api/reviews/:slid/invite
```json
{
    "friend": 5
}
```
###
- invited uid must be a friend of the logged in user
- cannot invite urself or the same person multiple times


## Delete a review
### req: DELETE http://localhost:4000/api/reviews/:slid
```json
{
    "reviwer": 5
}
```
### res: success message
- only the owner of the list or the reviewer can delete the review
- no error if you try to delete the same thing mult times
