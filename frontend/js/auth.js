import { sendRequest } from './helpers.js';
import { updatePage } from './index.js';

// register
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/register', 'POST', body);
    alert(JSON.stringify(result.message || result.error));
    if (result.message) {
        updatePage(true); // Update the page to logged-in state
    }
});

// login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/login', 'POST', body);
    alert(JSON.stringify(result.message || result.error));
    if (result.message) {
        updatePage(true); // Update the page to logged-in state
    }
});

// logout
document.getElementById('logout-button').addEventListener('click', async () => {
    const result = await sendRequest('/logout');
    alert(JSON.stringify(result.message || result.error));
    updatePage(false); // Update the page to logged-out state
});