// Main Application Logic and Routing for ADA

// Global Helpers
function logStep(stage, message) {
    console.log(`[${stage}] ${message}`);
}

function showError(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.className = 'error-banner';
        errorEl.style.display = 'block';
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.className = 'success-banner';
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}

auth.onAuthStateChanged(async (user) => {
    const path = window.location.pathname;
    const page = path.split("/").pop();

    logStep('Authentication check', user ? `User logged in: ${user.email}` : 'No user logged in');

    try {
        if (user) {
            // User is signed in
            await handleAuthenticatedUser(user, page);
        } else {
            // User is signed out
            hideLoading();
            if (page !== 'index.html' && page !== '') {
                logStep('Authentication check', 'Redirecting to login');
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        hideLoading();
        console.error("Auth state change error:", error);
        showError("An error occurred during authentication. Please try again.");
    }
});

async function handleAuthenticatedUser(user, page) {
    logStep('Profile loading', 'Checking user profile...');
    const userDoc = await db.collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
        logStep('Profile loading', 'Profile not found');
        if (page !== 'profile-setup.html') {
            logStep('Profile loading', 'Redirecting to profile setup');
            window.location.href = 'profile-setup.html';
        } else {
            hideLoading();
        }
        return;
    }

    const userData = userDoc.data();
    logStep('Profile loading', 'Profile loaded successfully');

    // Check community status
    logStep('Community loading', 'Checking community memberships...');
    const membershipsSnapshot = await db.collection('memberships').where('uid', '==', user.uid).get();

    if (membershipsSnapshot.empty) {
        logStep('Community loading', 'No communities joined');
        if (page !== 'communities.html' && page !== 'profile-setup.html') {
            logStep('Community loading', 'Redirecting to communities page');
            window.location.href = 'communities.html';
        } else {
            hideLoading();
        }
        return;
    }

    logStep('Community loading', `Found ${membershipsSnapshot.size} communities`);

    const lastCommId = sessionStorage.getItem('currentCommunityId') || userData.defaultCommunityId;

    if (lastCommId) {
        logStep('Community loading', `Selected community: ${lastCommId}`);
        sessionStorage.setItem('currentCommunityId', lastCommId);
        if (page === 'index.html' || page === '' || page === 'profile-setup.html' || (page === 'communities.html' && !window.location.search.includes('switch=true'))) {
             // Only redirect from index or profile setup.
             // If they are on communities page, we only redirect if they didn't explicitly go there to switch (simple check).
             // For now, let's just redirect if they are on index or profile-setup.
             if (page === 'index.html' || page === '' || page === 'profile-setup.html') {
                logStep('Dashboard rendering', 'Redirecting to dashboard');
                window.location.href = 'dashboard.html';
             } else {
                hideLoading();
             }
        } else {
            hideLoading();
        }
    } else {
        logStep('Community loading', 'No community selected');
        if (page === 'index.html' || page === '' || page === 'profile-setup.html') {
            logStep('Community loading', 'Redirecting to communities page');
            window.location.href = 'communities.html';
        } else {
            hideLoading();
        }
    }
}

// App level event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Switch Community Button
    const switchCommBtn = document.getElementById('switch-comm-btn');
    if (switchCommBtn) {
        switchCommBtn.addEventListener('click', () => {
            window.location.href = 'communities.html?switch=true';
        });
    }

    // Dashboard Sign Out
    const dashboardSignoutBtn = document.getElementById('header-signout-btn');
    if (dashboardSignoutBtn) {
        dashboardSignoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                sessionStorage.removeItem('currentCommunityId');
                window.location.href = 'index.html';
            });
        });
    }
});
