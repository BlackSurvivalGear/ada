// Community Management Logic for ADA

document.addEventListener('DOMContentLoaded', () => {
    const communitiesList = document.getElementById('communities-list');
    const joinForm = document.getElementById('join-community-form');
    const createForm = document.getElementById('create-community-form');
    const createModal = document.getElementById('create-community-modal');
    const showCreateModalBtn = document.getElementById('show-create-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const signoutBtn = document.getElementById('signout-btn');

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            logStep('Community loading', 'No user found, redirecting to index');
            window.location.href = 'index.html';
            return;
        }

        try {
            logStep('Community loading', 'Checking profile status');
            // Check if profile complete
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                logStep('Community loading', 'Profile not found, redirecting');
                window.location.href = 'profile-setup.html';
                return;
            }

            const userNameEl = document.getElementById('user-name');
            if (userNameEl) userNameEl.textContent = userDoc.data().displayName;

            loadUserCommunities(user.uid);
        } catch (error) {
            console.error("Community auth check error:", error);
            showError("Failed to verify account status.");
        }
    });

    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                sessionStorage.removeItem('currentCommunityId');
                window.location.href = 'index.html';
            });
        });
    }

    // Modal Toggles
    if (showCreateModalBtn) {
        showCreateModalBtn.addEventListener('click', () => {
            if (createModal) createModal.style.display = 'flex';
        });
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (createModal) createModal.style.display = 'none';
        });
    }
    window.onclick = (event) => {
        if (event.target == createModal) createModal.style.display = 'none';
    };

    // Load User's Communities
    async function loadUserCommunities(uid) {
        if (!communitiesList) return;

        try {
            logStep('Community loading', 'Fetching user memberships');
            const membershipsSnapshot = await db.collection('memberships')
                .where('uid', '==', uid)
                .get();

            if (membershipsSnapshot.empty) {
                logStep('Community loading', 'No memberships found. Showing onboarding UI.');
                communitiesList.innerHTML = `
                    <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                        <h3>Welcome to the ADA!</h3>
                        <p>You haven't joined any communities yet. To get started, you can either:</p>
                        <div style="margin-top: 2rem; display: flex; justify-content: center; gap: 20px;">
                            <button onclick="document.getElementById('invite-code').focus()" class="btn btn-secondary">Join via Invite Code</button>
                            <span>OR</span>
                            <button onclick="document.getElementById('show-create-modal').click()" class="btn btn-primary">Create Your Own</button>
                        </div>
                    </div>
                `;
                return;
            }

            communitiesList.innerHTML = '';
            for (const doc of membershipsSnapshot.docs) {
                const membership = doc.data();
                const communityDoc = await db.collection('communities').doc(membership.communityId).get();

                if (communityDoc.exists) {
                    const community = communityDoc.data();
                    renderCommunityCard(communityDoc.id, community, membership.role);
                }
            }
            logStep('Community loading', `Loaded ${membershipsSnapshot.size} communities`);
        } catch (error) {
            console.error("Error loading user communities:", error);
            communitiesList.innerHTML = '<p>Error loading communities. Please try again later.</p>';
            showError("Failed to load your communities.");
        }
    }

    function renderCommunityCard(id, data, role) {
        const card = document.createElement('div');
        card.className = 'community-card';
        card.innerHTML = `
            <div>
                <h3>${data.name}</h3>
                <p>${data.description.substring(0, 100)}${data.description.length > 100 ? '...' : ''}</p>
                <small>Role: ${role}</small>
            </div>
            <button class="btn btn-outline btn-small enter-comm-btn" data-id="${id}" style="margin-top: 15px;">Enter Community</button>
        `;

        card.querySelector('.enter-comm-btn').addEventListener('click', () => {
            sessionStorage.setItem('currentCommunityId', id);
            window.location.href = 'dashboard.html';
        });

        communitiesList.appendChild(card);
    }

    // Create Community
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            const nameEl = document.getElementById('comm-name');
            const descEl = document.getElementById('comm-description');
            const logoEl = document.getElementById('comm-logo');

            const name = nameEl ? nameEl.value : '';
            const description = descEl ? descEl.value : '';
            const logoFile = logoEl ? logoEl.files[0] : null;

            const submitBtn = createForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating...';
            }

            try {
                const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                let logoURL = '';

                const communityRef = db.collection('communities').doc();

                if (logoFile) {
                    const storageRef = storage.ref(`communities/${communityRef.id}/logo`);
                    await storageRef.put(logoFile);
                    logoURL = await storageRef.getDownloadURL();
                }

                await communityRef.set({
                    name,
                    description,
                    logoURL,
                    inviteCode,
                    ownerUid: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Create Membership
                await db.collection('memberships').doc(`${communityRef.id}_${user.uid}`).set({
                    communityId: communityRef.id,
                    uid: user.uid,
                    role: 'Owner',
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showSuccess(`Community created! Invite code: ${inviteCode}`);
                if (createModal) createModal.style.display = 'none';
                loadUserCommunities(user.uid);
            } catch (error) {
                console.error("Error creating community:", error);
                showError("Error creating community: " + error.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Create';
                }
            }
        });
    }

    // Join Community
    if (joinForm) {
        joinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            const inviteEl = document.getElementById('invite-code');
            const inviteCode = inviteEl ? inviteEl.value.trim().toUpperCase() : '';

            if (!inviteCode) return;

            const submitBtn = joinForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Joining...';
            }

            try {
                const query = await db.collection('communities')
                    .where('inviteCode', '==', inviteCode)
                    .limit(1)
                    .get();

                if (query.empty) {
                    showError("Invalid invite code.");
                    return;
                }

                const communityId = query.docs[0].id;

                // Check if already a member
                const membershipDoc = await db.collection('memberships').doc(`${communityId}_${user.uid}`).get();
                if (membershipDoc.exists) {
                    showError("You are already a member of this community.");
                    return;
                }

                await db.collection('memberships').doc(`${communityId}_${user.uid}`).set({
                    communityId,
                    uid: user.uid,
                    role: 'Member',
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showSuccess("Joined successfully!");
                if (inviteEl) inviteEl.value = '';
                loadUserCommunities(user.uid);
            } catch (error) {
                console.error("Error joining community:", error);
                showError("Error joining community: " + error.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Join';
                }
            }
        });
    }
});
