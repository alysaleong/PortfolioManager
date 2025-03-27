import express from 'express';

const router = express.Router();

// FRIENDS 
// get my friends
router.get('/', async (req, res) => {

});

// INCOMING REQUEST
// get my incoming requests 
router.get('/requests/incoming', async (req, res) => {

});

// accept request
router.post('/requests/accept', async (req, res) => {

});

// reject request
router.post('/requests/reject', async (req, res) => {

});



// OUTGOING REQUEST 
// get my outgoing requests 
router.get('/requests/outgoing', async (req, res) => {

})

// send a request
router.post('/requests', async (req, res) => {

}); 


export default { router };