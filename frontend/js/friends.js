import { sendRequest, populateDropdown } from './helpers.js';

export async function loadFriends() {
    const result = await sendRequest('/friends');
    const friendsList = document.getElementById('friends-list');
    const inviteFriendContainer = document.getElementById('invite-friend-container');

    friendsList.innerHTML = '<h3>Your Friends</h3>'; // clear the list before populating

    // create friend item for each friend
    result.forEach(friend => {
        const friendElmt = document.createElement('div');
        friendElmt.classList.add('friend-item');
        friendElmt.innerHTML = `
            <div class="friend-email">${friend.email}</div>
            <button class="remove-friend-button" data-uid="${friend.uid}">Remove</button>
        `;
        friendsList.appendChild(friendElmt);
    });

    // add event listeners for remove friend buttons
    const removeButtons = document.querySelectorAll('.remove-friend-button');
    removeButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const uid = e.target.dataset.uid;
            console.log(`Removing friend with UID: ${uid}`);
            const result = await sendRequest('/friends', 'DELETE', { friend: uid });
            alert(JSON.stringify(result.message || result.error));
            await loadFriends(); // reload friends list after removal
        });
    });

    // Populate dropdowns for inviting friends to review stock lists
    await populateInviteDropdowns();
    inviteFriendContainer.style.display = 'block';
}

// Populate stock list and friend dropdowns
async function populateInviteDropdowns() {
    const stocklistDropdown = document.getElementById('stocklist-dropdown');
    const friendDropdown = document.getElementById('friend-dropdown');

    // Clear existing options
    stocklistDropdown.innerHTML = '<option value="" disabled selected>Select Stock List</option>';
    friendDropdown.innerHTML = '<option value="" disabled selected>Select Friend</option>';

    // Fetch stock lists
    const stocklists = await sendRequest('/stocklists');
    const stocklistOptions = stocklists.map(stocklist => stocklist.slname);
    const stocklistValues = stocklists.map(stocklist => stocklist.slid);
    populateDropdown(stocklistDropdown, stocklistOptions, stocklistValues);

    // Fetch friends
    const friends = await sendRequest('/friends');
    const friendOptions = friends.map(friend => friend.email);
    const friendValues = friends.map(friend => friend.uid);
    populateDropdown(friendDropdown, friendOptions, friendValues);
}

// display list of friend with delete button for each friend
document.getElementById('friends-tab').addEventListener('click', async () => {
    await loadFriends();
});

// event listener for add friend button
document.getElementById('add-friend-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest('/friends/requests', 'POST', body);
    alert(JSON.stringify(result.message || result.error));
    await loadFriends(); // reload friends list after adding
});

// Handle inviting a friend to review a stock list
document.getElementById('invite-friend-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());
    const result = await sendRequest(`/reviews/${body.slid}/invite`, 'POST', { friend: body.friend });
    alert(JSON.stringify(result.message || result.error));
});