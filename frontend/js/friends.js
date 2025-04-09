import { sendRequest } from './helpers.js';

export async function loadFriends() {
    const result = await sendRequest('/friends');
    const friendsList = document.getElementById('friends-list');

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
            alert(JSON.stringify(result));
            await loadFriends(); // reload friends list after removal
        });
    });
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
    alert(JSON.stringify(result));
    await loadFriends(); // reload friends list after adding
});