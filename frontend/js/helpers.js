const apiBase = 'http://localhost:4000/api';

// helper function to send requests with appropriate headers
export async function sendRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies in requests
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

// get friend dropdown 
// async function populateAddFriendsDropdown() {
//     const dropdown = document.getElementById('add-friend-dropdown');
//     dropdown.innerHTML = ''; // Clear existing options
//     // fetch users from the server
//     const res = await sendRequest('/users');
//     const emails = res.map(user => user.email);
//     const uids = res.map(user => user.uid);
//     console.log(res);
//     console.log(emails);
//     // populate the dropdown with emails and uids
//     populateDropdown(dropdown, emails, uids);
// }

//populateAddFriendsDropdown();