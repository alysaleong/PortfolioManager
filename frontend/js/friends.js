import { sendRequest } from './helpers.js';

// get friends
document.getElementById('get-friends').addEventListener('click', async () => {
    const result = await sendRequest('/friends');
    alert(JSON.stringify(result));
});

// remove friend
document.getElementById('remove-friend-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/friends', 'DELETE', body);
    alert(JSON.stringify(result));
});