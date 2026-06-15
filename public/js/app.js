// Main Application Logic and Routing for ADA

auth.onAuthStateChanged(async (user) => {
    const path = window.location.pathname;
    const page = path.split("/").pop();

    if (user) {
        // User is signed in
        if (page === 'index.html' || page === '') {
            checkUserProfile(user);
        }
    } else {
        // User is signed out
        if (page !== 'index.html' && page !== '') {
            window.location.href = 'index.html';
        }
    }
});

// App level event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Switch Community Button
    const switchCommBtn = document.getElementById('switch-comm-btn');
    if (switchCommBtn) {
        switchCommBtn.addEventListener('click', () => {
            window.location.href = 'communities.html';
        });
    }

    // Dashboard Sign Out
    const dashboardSignoutBtn = document.getElementById('header-signout-btn');
    if (dashboardSignoutBtn) {
        dashboardSignoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'index.html');
        });
    }
});

// Global helpers
async function checkUserProfile(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            window.location.href = 'profile-setup.html';
        } else {
            const userData = userDoc.data();
            const lastCommId = sessionStorage.getItem('currentCommunityId') || userData.defaultCommunityId;

            if (lastCommId) {
                sessionStorage.setItem('currentCommunityId', lastCommId);
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'communities.html';
            }
        }
    } catch (error) {
        console.error("Error checking user profile:", error);
    }
}
