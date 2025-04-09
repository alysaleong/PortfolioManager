import { sendRequest } from './helpers.js';

// create review
document.getElementById('create-review-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/reviews', 'POST', body);
    alert(JSON.stringify(result));
});