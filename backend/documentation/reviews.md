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
