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
            window.location.href = 'index.html';
            return;
        }

        // Check if profile complete
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            window.location.href = 'profile-setup.html';
            return;
        }

        document.getElementById('user-name').textContent = userDoc.data().displayName;
        loadUserCommunities(user.uid);
    });

    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => window.location.href = 'index.html');
        });
    }

    // Modal Toggles
    if (showCreateModalBtn) {
        showCreateModalBtn.addEventListener('click', () => createModal.style.display = 'flex');
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => createModal.style.display = 'none');
    }
    window.onclick = (event) => {
        if (event.target == createModal) createModal.style.display = 'none';
    };

    // Load User's Communities
    async function loadUserCommunities(uid) {
        if (!communitiesList) return;

        try {
            const membershipsSnapshot = await db.collection('memberships')
                .where('uid', '==', uid)
                .get();

            if (membershipsSnapshot.empty) {
                communitiesList.innerHTML = '<p>You haven\'t joined any communities yet.</p>';
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
        } catch (error) {
            console.error(error);
            communitiesList.innerHTML = '<p>Error loading communities.</p>';
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
            const name = document.getElementById('comm-name').value;
            const description = document.getElementById('comm-description').value;
            const logoFile = document.getElementById('comm-logo').files[0];

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

                alert(`Community created! Invite code: ${inviteCode}`);
                createModal.style.display = 'none';
                loadUserCommunities(user.uid);
            } catch (error) {
                console.error(error);
                alert("Error creating community: " + error.message);
            }
        });
    }

    // Join Community
    if (joinForm) {
        joinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            const inviteCode = document.getElementById('invite-code').value.trim().toUpperCase();

            try {
                const query = await db.collection('communities')
                    .where('inviteCode', '==', inviteCode)
                    .limit(1)
                    .get();

                if (query.empty) {
                    alert("Invalid invite code.");
                    return;
                }

                const communityId = query.docs[0].id;

                // Check if already a member
                const membershipDoc = await db.collection('memberships').doc(`${communityId}_${user.uid}`).get();
                if (membershipDoc.exists) {
                    alert("You are already a member of this community.");
                    return;
                }

                await db.collection('memberships').doc(`${communityId}_${user.uid}`).set({
                    communityId,
                    uid: user.uid,
                    role: 'Member',
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert("Joined successfully!");
                document.getElementById('invite-code').value = '';
                loadUserCommunities(user.uid);
            } catch (error) {
                console.error(error);
                alert("Error joining community: " + error.message);
            }
        });
    }
});
