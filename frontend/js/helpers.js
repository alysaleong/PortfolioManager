const apiBase = 'http://localhost:4000/api';

// helper function to send requests with appropriate headers
export async function sendRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${apiBase}${endpoint}`, options);
    return response.json();
}

// helper to check if user is logged in
export async function checkLoginStatus() {
    try {
        const response = await sendRequest('/me');
        return response.uid !== undefined;
    } catch (error) {
        console.error("Error checking login status:", error);
        return false;
    }
}

export async function getLoggedInEmail() {
    try {
        const response = await sendRequest('/me');
        return response.email || null;
    } catch (error) {
        console.error("Error fetching logged-in email:", error);
        return null;
    }
}

export function populateDropdown(dropdown, options, values) {
    for (let i= 0; i < options.length; i++) {
        const item = options[i];
        const value = values[i];
        const option = document.createElement('option');
        option.textContent = item;
        option.value = value;
        dropdown.appendChild(option);
    }
}