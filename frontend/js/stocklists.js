import { sendRequest } from './helpers.js';

// get stock lists
document.getElementById('get-stocklists').addEventListener('click', async () => {
    const result = await sendRequest('/stocklists');
    alert(JSON.stringify(result));
});

// create stock list
document.getElementById('create-stocklist-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    body.is_public = body.is_public === 'on'; // Convert checkbox to boolean
    const result = await sendRequest('/stocklists', 'POST', body);
    alert(JSON.stringify(result));
});