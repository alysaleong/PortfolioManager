import { sendRequest } from './helpers.js';

let selectedStockListId = null;

// Load public stock lists
async function loadPublicLists() {
    const targetSection = document.getElementById("review-content");
    targetSection.style.display = 'block';

    const publicListsContainer = document.getElementById('public-lists-container');
    publicListsContainer.innerHTML = '<h3>Public Stock Lists</h3>'; // Clear the container
    const publicLists = await sendRequest('/stocklists/public');
    publicLists.forEach(list => {
        if (list.public) {
            const listEl = document.createElement('div');
            listEl.classList.add('stocklist-item');
            listEl.innerHTML = `
                <div class="stocklist-name">${list.slid}: ${list.slname}</div>
                <button class="view-reviews-button" data-slid="${list.slid}">View Reviews</button>
                <button class="write-review-button" data-slid="${list.slid}">Write Review</button>
            `;
            publicListsContainer.appendChild(listEl);
        }
    });

    // Add event listeners for "View Reviews" buttons
    const viewReviewsButtons = document.querySelectorAll('.view-reviews-button');
    viewReviewsButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const slid = e.target.dataset.slid;
            await loadStockListDetails(slid, true); // Load stocks and reviews for the selected stock list
        });
    });

    // Add event listeners for "Write Review" buttons
    const writeReviewButtons = document.querySelectorAll('.write-review-button');
    writeReviewButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault(); // Prevent default behavior
            selectedStockListId = e.target.dataset.slid;
            await loadStockListDetails(selectedStockListId, false); // Load stocks and show the review form
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
            <div class="stocklist-name">${list.slid}: ${list.slname} (Owner: ${ownerEmail.email})</div>
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
            await loadStockListDetails(selectedStockListId, false); // Load stocks and show the review form
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
                alert(result.message || result.error);
                await loadReviewingLists(); // Reload the reviewing lists after deletion
            }
        });
    });
}

// Load stock list details for viewing, including stocks, reviews, and stats
async function loadStockListDetails(slid, isViewMode) {
    const stockListDetails = await sendRequest(`/stocklists/${slid}`);
    const stockListDetailsContainer = document.getElementById('review-stocks-container');
    const stockListReviewsContainer = document.getElementById('public-stocklist-reviews-container');
    const writeReviewForm = document.getElementById('write-review-form');
    const stockListStatsContainer = document.getElementById('review-stocklist-stats-container');

    // Display stocks in the stock list
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

    if (isViewMode) {
        // Load and display reviews for the stock list
        try {
            const reviews = await sendRequest(`/reviews/${slid}`);
            if (reviews.length === 0) {
                stockListReviewsContainer.innerHTML = '<div>No reviews available for this stock list.</div>';
            } else {
                let reviewsHTML = '<h3>Reviews</h3>';
                for (const review of reviews) {
                    const userEmail = await sendRequest(`/users/uid/${review.uid}/email`);
                    reviewsHTML += `
                        <div class="review-item">
                            <div><strong>User:</strong> ${userEmail.email}</div>
                            <div><strong>Review:</strong> ${review.review || 'No review text provided'}</div>
                        </div>
                    `;
                }
                stockListReviewsContainer.innerHTML = reviewsHTML;
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
            stockListReviewsContainer.innerHTML = '<div>Error loading reviews.</div>';
        }
        stockListReviewsContainer.style.display = 'block';
        writeReviewForm.style.display = 'none'; // Hide the review form
    } else {
        // Show the review form for writing/editing a review
        writeReviewForm.style.display = 'block';
        stockListReviewsContainer.style.display = 'none'; // Hide the reviews section
        await prefillReviewForm(slid); // Pre-fill the form with the existing review
    }

    // Display stock list statistics
    stockListStatsContainer.style.display = 'block';
    stockListStatsContainer.innerHTML = `
        <h3>Stock List Statistics</h3>
        <form id="review-stocklist-stats-form">
            <label for="start-date">Start Date:</label>
            <input type="date" id="start-date4" required>
            <label for="end-date">End Date:</label>
            <input type="date" id="end-date4" required>
            <button type="submit">Get Statistics</button>
        </form>
        <div id="review-stocklist-stats-results"></div>
    `;

    // Add event listener for the stock list stats form
    document.getElementById('review-stocklist-stats-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const startDate = document.getElementById('start-date4').value;
        const endDate = document.getElementById('end-date4').value;

        const stocks = stockListDetails.stocks;
        const stockListStatsContainer = document.getElementById('review-stocklist-stats-container');
        await displayStockListStats(stocks, stockListStatsContainer, startDate, endDate, slid);
    });
}

// Display stock list statistics
async function displayStockListStats(stocks, container, startDate, endDate, slid) {
    try {
        const covPromises = stocks.map(stock => sendRequest(`/stocks/symbol/${stock.symbol}/cov`, 'POST', {
            start_date: startDate,
            end_date: endDate
        }));
        const betaPromises = stocks.map(stock => sendRequest(`/stocks/symbol/${stock.symbol}/beta`, 'POST', {
            start_date: startDate,
            end_date: endDate
        }));
        const covMatrixPromise = sendRequest('/stocklists/cov', 'POST', {
            slid: slid,
            start_date: startDate,
            end_date: endDate
        });

        const covResults = await Promise.all(covPromises);
        const betaResults = await Promise.all(betaPromises);
        const covMatrix = await covMatrixPromise;

        const resultsContainer = document.getElementById('review-stocklist-stats-results');
        resultsContainer.innerHTML = `<h4>Coefficient of Variation (COV)</h4>`;
        stocks.forEach((stock, index) => {
            resultsContainer.innerHTML += `<div>${stock.symbol}: ${covResults[index][0]?.cov || 'N/A'}</div>`;
        });

        resultsContainer.innerHTML += `<h4>Beta Coefficient</h4>`;
        stocks.forEach((stock, index) => {
            resultsContainer.innerHTML += `<div>${stock.symbol}: ${betaResults[index][0]?.beta || 'N/A'}</div>`;
        });

        resultsContainer.innerHTML += `<h4>Covariance Matrix</h4>`;
        if (covMatrix.length > 0) {
            const symbols = stocks.map(stock => stock.symbol);
            let matrixHTML = '<table border="1" style="border-collapse: collapse; text-align: center;">';
            matrixHTML += '<tr><th></th>' + symbols.map(symbol => `<th>${symbol}</th>`).join('') + '</tr>';
            covMatrix.forEach((row, rowIndex) => {
                matrixHTML += `<tr><th>${symbols[rowIndex]}</th>` + row.map(cell => `<td>${cell[0]}</td>`).join('') + '</tr>';
            });
            matrixHTML += '</table>';
            resultsContainer.innerHTML += matrixHTML;
        } else {
            resultsContainer.innerHTML += `<div>No covariance matrix available</div>`;
        }
    } catch (error) {
        console.error('Error fetching stock list stats:', error);
        container.innerHTML += `<div>Error fetching stock list stats</div>`;
    }
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
        if (existingReview && existingReview.review != undefined) {
            // If a review exists, send a PATCH request to update it
            const result = await sendRequest(`/reviews/${selectedStockListId}`, 'PATCH', body);
            alert(result.message || result.error);
        }
        else 
        {
            // If no review exists, send a POST request to create it
            const result = await sendRequest(`/reviews/${selectedStockListId}`, 'POST', body);
            alert(result.message || result.error);
        }
    } catch (error) {
        // If no review exists, send a POST request to create it
        const result = await sendRequest(`/reviews/${selectedStockListId}`, 'POST', body);
        alert(result.message || result.error);
    }

    document.getElementById('write-review-form').style.display = 'none';
    document.getElementById('review-stocks-container').style.display = 'none'; // Hide stocks after submission
});