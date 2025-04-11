import { sendRequest } from "./helpers.js";

// populate incoming requests list
export async function loadIncomingRequest() {
    const res = await sendRequest('/friends/requests/incoming');
    const incomingRequests = document.getElementById('incoming-requests-list');
    incomingRequests.innerHTML = '<h3>Incoming Requests</h3>'; // clear the list before populating

    // create request item for each request
    res.forEach(request => {
        const requestElmt = document.createElement('div');
        requestElmt.classList.add('request-item');
        requestElmt.innerHTML = `
            <div class="request-email">${request.email}</div>
            <div class="request-buttons">
                <button class="accept-request-button" data-uid="${request.requester}">Accept</button>
                <button class="reject-request-button" data-uid="${request.requester}">Reject</button>
            </div>
        `;
        incomingRequests.appendChild(requestElmt);
    });

    // add event listeners for accept and reject buttons
    const acceptButtons = document.querySelectorAll('.accept-request-button');
    acceptButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const uid = e.target.dataset.uid;
            console.log(`Accepting request from UID: ${uid}`);
            const result = await sendRequest('/friends/requests/accept', 'POST', { requester: uid });
            alert(result.message || result.error);
            await loadIncomingRequest(); // reload incoming requests list after accepting
        });
    });

    const rejectButtons = document.querySelectorAll('.reject-request-button');
    rejectButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const uid = e.target.dataset.uid;
            console.log(`Rejecting request from UID: ${uid}`);
            const result = await sendRequest('/friends/requests/reject', 'POST', { requester: uid });
            alert(result.message || result.error);
            await loadIncomingRequest(); // reload incoming requests list after rejecting
        });
    });
}

export async function loadOutgoingRequest() {
    const res = await sendRequest('/friends/requests/outgoing');
    const outgoingRequests = document.getElementById('outgoing-requests-list');
    outgoingRequests.innerHTML = '<h3>Outgoing Requests</h3>'; // clear the list before populating

    // list outgonig requests
    res.forEach(request => {
        const requestElmt = document.createElement('div');
        requestElmt.classList.add('request-item');
        requestElmt.innerHTML = `
            <div class="request-email">${request.email}</div>
        `;
        outgoingRequests.appendChild(requestElmt);
    });
}

// populate incoming and outgoing requests list on page load
document.getElementById('requests-tab').addEventListener('click', async () => {
    await loadIncomingRequest();
    await loadOutgoingRequest();

});