import { sendRequest } from './helpers.js';

let selectedStockListId = null;

// Load public stock lists
async function loadPublicLists() {
    const targetSection = document.getElementById("review-content");
    targetSection.style.display = 'block'; 

    const publicListsContainer = document.getElementById('public-lists-container');
    publicListsContainer.innerHTML = '<h3>Public Stock Lists</h3>'; // Clear the container
    const publicLists = await sendRequest('/stocklists');
    publicLists.forEach(list => {
        if (list.public) {
            const listEl = document.createElement('div');
            listEl.classList.add('stocklist-item');
            listEl.innerHTML = `
                <div class="stocklist-name">${list.slname}</div>
                <button class="write-review-button" data-slid="${list.slid}">Write Review</button>
            `;
            publicListsContainer.appendChild(listEl);
        }
    });

    // Add event listeners for "View Stocks" buttons
    const viewStocksButtons = document.querySelectorAll('.view-stocks-button');
    viewStocksButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const slid = e.target.dataset.slid;
            await loadStockListDetails(slid);
        });
    });

    // Add event listeners for "Write Review" buttons
    const writeReviewButtons = document.querySelectorAll('.write-review-button');
    writeReviewButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent default behavior
            selectedStockListId = e.target.dataset.slid;
            await loadStockListDetails(selectedStockListId); // Load stocks in the stock list
            document.getElementById('write-review-form').style.display = 'block';
            await prefillReviewForm(selectedStockListId); // Pre-fill the form with the existing review
        });
    });
}

// Load lists being reviewed
async function loadReviewingLists() {
    const targetSection = document.getElementById("review-content");
    targetSection.style.display = 'block'; 

    const reviewingListsContainer = document.getElementById('reviewing-lists-container');
    reviewingListsContainer.innerHTML = '<h3>Lists I\'m Reviewing</h3>'; // Clear the container
    const reviewingLists = await sendRequest('/stocklists/reviewing');
    for (const list of reviewingLists) {
        // Fetch the owner's email for each stock list
        const ownerEmail = await sendRequest(`/users/uid/${list.uid}/email`);
        const listEl = document.createElement('div');
        listEl.classList.add('stocklist-item');
        listEl.innerHTML = `
            <div class="stocklist-name">${list.slname} (Owner: ${ownerEmail.email})</div>
            <button class="write-review-button" data-slid="${list.slid}">Write Review</button>
            <button class="delete-review-button" data-slid="${list.slid}">Delete Review</button>
        `;
        reviewingListsContainer.appendChild(listEl);
    }

    // Add event listeners for "Write Review" buttons
    const writeReviewButtons = document.querySelectorAll('.write-review-button');
    writeReviewButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent default behavior
            selectedStockListId = e.target.dataset.slid;
            await loadStockListDetails(selectedStockListId); // Load stocks in the stock list
            document.getElementById('write-review-form').style.display = 'block';
            await prefillReviewForm(selectedStockListId); // Pre-fill the form with the existing review
        });
    });

    // Add event listeners for "Delete Review" buttons
    const deleteReviewButtons = document.querySelectorAll('.delete-review-button');
    deleteReviewButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent default behavior
            const slid = e.target.dataset.slid;
            const confirmDelete = confirm(`Are you sure you want to delete your review for stock list ${slid}?`);
            if (confirmDelete) {
                const result = await sendRequest(`/reviews/${slid}`, 'DELETE');
                alert(JSON.stringify(result.message || result.error));
                await loadReviewingLists(); // Reload the reviewing lists after deletion
            }
        });
    });
}

// Load stock list details for viewing
async function loadStockListDetails(slid) {
    const stockListDetails = await sendRequest(`/stocklists/${slid}`);
    const stockListDetailsContainer = document.getElementById('review-stocks-container');
    stockListDetailsContainer.innerHTML = `
        <h3>Stocks in ${stockListDetails.slname}</h3>
    `;
    stockListDetails.stocks.forEach(stock => {
        const stockEl = document.createElement('div');
        stockEl.classList.add('stock-item');
        stockEl.innerHTML = `
            <div class="stock-symbol">${stock.symbol}</div>
            <div class="stock-quantity">Quantity: ${stock.quantity}</div>
            <div class="stock-value">Value: $${stock.total_value}</div>
        `;
        stockListDetailsContainer.appendChild(stockEl);
    });
    stockListDetailsContainer.style.display = 'block';
}

// Pre-fill the review form with the existing review if available
async function prefillReviewForm(slid) {
    try {
        // Fetch the user's UID from the /me endpoint
        const user = await sendRequest('/me');
        const uid = user.uid;

        // Fetch the existing review using the UID
        const existingReview = await sendRequest(`/reviews/${slid}/users/${uid}`, 'GET');
        if (existingReview && existingReview.review !== undefined) {
            const reviewForm = document.getElementById('write-review-form');
            reviewForm.querySelector('textarea[name="review"]').value = existingReview.review;
        }
    } catch (error) {
        console.log("No existing review found or error fetching review:", error);
    }
}

// Handle toggles for public and reviewing lists
document.getElementById('toggle-public-lists').addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent default behavior
    const publicListsContainer = document.getElementById('public-lists-container');
    const reviewingListsContainer = document.getElementById('reviewing-lists-container');
    const reviewStocksContainer = document.getElementById('review-stocks-container'); // Stocks container
    const writeReviewForm = document.getElementById('write-review-form');

    reviewingListsContainer.style.display = 'none'; // Hide the other container
    reviewStocksContainer.style.display = 'none'; // Hide the stocks list
    writeReviewForm.style.display = 'none'; // Hide the review form

    await loadPublicLists(); // Load content first
    publicListsContainer.style.display = 'block'; // Then display the container
    const targetSection = document.getElementById("review-content");
    targetSection.style.display = 'block';
});

document.getElementById('toggle-reviewing-lists').addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent default behavior
    const reviewingListsContainer = document.getElementById('reviewing-lists-container');
    const publicListsContainer = document.getElementById('public-lists-container');
    const reviewStocksContainer = document.getElementById('review-stocks-container'); // Stocks container
    const writeReviewForm = document.getElementById('write-review-form');

    publicListsContainer.style.display = 'none'; // Hide the other container
    reviewStocksContainer.style.display = 'none'; // Hide the stocks list
    writeReviewForm.style.display = 'none'; // Hide the review form

    await loadReviewingLists(); // Load content first
    reviewingListsContainer.style.display = 'block'; // Then display the container
    const targetSection = document.getElementById("review-content");
    targetSection.style.display = 'block';
});

// Handle review submission
document.getElementById('write-review-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default behavior
    if (!selectedStockListId) {
        alert('Please select a stock list first.');
        return;
    }
    const formData = new FormData(e.target);
    const body = Object.fromEntries(formData.entries());

    try {
        // Try to fetch the existing review
        // Fetch the user's UID from the /me endpoint
        const user = await sendRequest('/me');
        const uid = user.uid;

        const existingReview = await sendRequest(`/reviews/${selectedStockListId}/users/${uid}`, 'GET');
        if (existingReview && existingReview.review !== undefined) {
            // If a review exists, send a PATCH request to update it
            const result = await sendRequest(`/reviews/${selectedStockListId}`, 'PATCH', body);
            alert(JSON.stringify(result.message || result.error));
        }
    } catch (error) {
        // If no review exists, send a POST request to create it
        const result = await sendRequest(`/reviews/${selectedStockListId}`, 'POST', body);
        alert(JSON.stringify(result.message || result.error));
    }

    document.getElementById('write-review-form').style.display = 'none';
    document.getElementById('review-stocks-container').style.display = 'none'; // Hide stocks after submission
});