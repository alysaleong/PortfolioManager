import { checkLoginStatus, getLoggedInEmail } from './helpers.js';
import { loadFriends } from './friends.js';
import { loadIncomingRequest, loadOutgoingRequest } from './requests.js';

// update the page based on login status
export async function updatePage(isLoggedIn = null) {
    // check if they are logged in 
    if (isLoggedIn === null) {
        isLoggedIn = await checkLoginStatus();
    }

    const authSection = document.getElementById('auth-section');
    const mainContent = document.getElementById('main-content');
    const userEmailDisplay = document.getElementById('user-email');

    // if user is logged in, hide auth section and show main content
    // else show auth section and hide main content
    if (isLoggedIn) {
        authSection.style.display = 'none';
        mainContent.style.display = 'block';
        const email = await getLoggedInEmail();
        if (email) {
            userEmailDisplay.textContent = `Logged in as: ${email}`;
            userEmailDisplay.style.display = 'block';
        }
        loadFriends();
        loadIncomingRequest();
        loadOutgoingRequest();
    } else {
        authSection.style.display = 'block';
        mainContent.style.display = 'none';
        userEmailDisplay.style.display = 'none';
    }
}

// each button in nav bar has a data-target attribute that corresponds to the id of the section to show
// when clicked, hide all sections and show the one that matches the data-target attribute
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-button');
    const contentSections = document.querySelectorAll('.content-section');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // get data-target attribute which is the id of the section to show
            const targetId = button.dataset.target; 

            contentSections.forEach(section => {
                section.style.display = 'none';
            });

            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
        });
    });
}

// Call updatePage and setupNavigation on page load
document.addEventListener('DOMContentLoaded', () => {
    updatePage();
    setupNavigation(); 
});
