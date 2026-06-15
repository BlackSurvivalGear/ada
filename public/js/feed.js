// Feed, Posting, Likes, and Comments Logic for ADA

document.addEventListener('DOMContentLoaded', () => {
    const feedContainer = document.getElementById('feed-container');
    const postForm = document.getElementById('submit-post-btn');
    const postContent = document.getElementById('post-content');
    const postImage = document.getElementById('post-image');
    const imagePreview = document.getElementById('post-image-preview');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const removeImageBtn = document.getElementById('remove-image');

    let currentCommunityId = sessionStorage.getItem('currentCommunityId');
    let currentUserProfile = null;
    let unsubscribeFeed = null;

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            logStep('Dashboard rendering', 'No user found, redirecting to index');
            window.location.href = 'index.html';
            return;
        }

        if (!currentCommunityId) {
            logStep('Dashboard rendering', 'No community ID found, redirecting to communities');
            window.location.href = 'communities.html';
            return;
        }

        try {
            logStep('Dashboard rendering', `Loading data for community: ${currentCommunityId}`);
            // Fetch user profile and community membership
            const [userDoc, membershipDoc, communityDoc] = await Promise.all([
                db.collection('users').doc(user.uid).get(),
                db.collection('memberships').doc(`${currentCommunityId}_${user.uid}`).get(),
                db.collection('communities').doc(currentCommunityId).get()
            ]);

            if (!userDoc.exists) {
                logStep('Dashboard rendering', 'User profile not found');
                window.location.href = 'profile-setup.html';
                return;
            }

            if (!communityDoc.exists) {
                logStep('Dashboard rendering', 'Community not found');
                showError("Community not found. Redirecting...");
                setTimeout(() => window.location.href = 'communities.html', 3000);
                return;
            }

            if (!membershipDoc.exists) {
                logStep('Dashboard rendering', 'Membership not found');
                showError("You are not a member of this community.");
                setTimeout(() => window.location.href = 'communities.html', 3000);
                return;
            }

            currentUserProfile = userDoc.data();
            logStep('Dashboard rendering', 'Updating Dashboard UI');
            updateDashboardUI(communityDoc.data(), membershipDoc.data());
            setupFeedListener();
        } catch (error) {
            console.error("Dashboard loading error:", error);
            showError("Failed to load dashboard: " + error.message);
        }
    });

    function updateDashboardUI(communityData, membershipData) {
        const nameEl = document.getElementById('current-community-name');
        const descEl = document.getElementById('community-desc');
        const roleEl = document.getElementById('user-role');
        const inviteEl = document.getElementById('display-invite-code');

        if (nameEl) nameEl.textContent = communityData.name;
        if (descEl) descEl.textContent = communityData.description;
        if (roleEl) roleEl.textContent = membershipData.role;
        if (inviteEl) inviteEl.textContent = communityData.inviteCode;

        if (currentUserProfile && currentUserProfile.photoURL) {
            const headerPhoto = document.getElementById('header-user-photo');
            const postPhoto = document.getElementById('post-author-photo');
            if (headerPhoto) headerPhoto.src = currentUserProfile.photoURL;
            if (postPhoto) postPhoto.src = currentUserProfile.photoURL;
        }

        // Member count (approximate or via aggregation)
        db.collection('memberships').where('communityId', '==', currentCommunityId).get().then(snap => {
            const countEl = document.getElementById('member-count');
            if (countEl) countEl.textContent = snap.size;

            // Recently joined
            const recentList = document.getElementById('recent-members-list');
            if (recentList) {
                recentList.innerHTML = '';
                // Ideally would join with users collection, but for MVP we just show a few
                snap.docs.slice(0, 5).forEach(async mDoc => {
                    const uDoc = await db.collection('users').doc(mDoc.data().uid).get();
                    if (uDoc.exists) {
                        const li = document.createElement('li');
                        li.style.display = 'flex';
                        li.style.alignItems = 'center';
                        li.style.gap = '10px';
                        li.style.marginBottom = '10px';
                        li.innerHTML = `
                            <img src="${uDoc.data().photoURL || 'assets/default-avatar.png'}" class="avatar-small" style="width:30px; height:30px">
                            <span>${uDoc.data().displayName}</span>
                        `;
                        recentList.appendChild(li);
                    }
                });
            }
        }).catch(err => console.error("Error loading member count:", err));
    }

    // Image Preview
    if (postImage) {
        postImage.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (imagePreview) imagePreview.src = e.target.result;
                    if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            if (postImage) postImage.value = '';
            if (imagePreview) imagePreview.src = '';
            if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
        });
    }

    // Posting
    if (postForm) {
        postForm.addEventListener('click', async () => {
            const content = postContent ? postContent.value.trim() : '';
            const file = postImage ? postImage.files[0] : null;

            if (!content && !file) return;

            postForm.disabled = true;
            postForm.textContent = 'Posting...';

            try {
                const postRef = db.collection('posts').doc();
                let imageURL = '';

                if (file) {
                    const storageRef = storage.ref(`posts/${currentCommunityId}/${postRef.id}`);
                    await storageRef.put(file);
                    imageURL = await storageRef.getDownloadURL();
                }

                await postRef.set({
                    communityId: currentCommunityId,
                    authorUid: auth.currentUser.uid,
                    authorName: currentUserProfile.displayName,
                    authorPhoto: currentUserProfile.photoURL || '',
                    content,
                    imageURL,
                    likeCount: 0,
                    commentCount: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                if (postContent) postContent.value = '';
                if (postImage) postImage.value = '';
                if (imagePreview) imagePreview.src = '';
                if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
            } catch (error) {
                console.error(error);
                showError("Error creating post: " + error.message);
            } finally {
                postForm.disabled = false;
                postForm.textContent = 'Post';
            }
        });
    }

    function setupFeedListener() {
        if (!feedContainer) return;
        if (unsubscribeFeed) unsubscribeFeed();

        unsubscribeFeed = db.collection('posts')
            .where('communityId', '==', currentCommunityId)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                feedContainer.innerHTML = '';
                if (snapshot.empty) {
                    feedContainer.innerHTML = '<p class="loading">No posts yet. Be the first to share!</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    renderPost(doc.id, doc.data());
                });
            }, error => {
                console.error("Feed error:", error);
                feedContainer.innerHTML = '<p>Error loading feed. Make sure you have the required indexes.</p>';
                showError("Feed error: " + error.message);
            });
    }

    async function renderPost(postId, data) {
        if (!feedContainer) return;

        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        const date = data.createdAt ? data.createdAt.toDate().toLocaleString() : 'Just now';

        postCard.innerHTML = `
            <div class="post-header">
                <img src="${data.authorPhoto || 'assets/default-avatar.png'}" alt="${data.authorName}" class="avatar-small">
                <div class="post-author-info">
                    <h4>${data.authorName}</h4>
                    <span class="post-time">${date}</span>
                </div>
            </div>
            <div class="post-content">
                <p>${data.content}</p>
            </div>
            ${data.imageURL ? `<img src="${data.imageURL}" class="post-image">` : ''}
            <div class="post-footer">
                <button class="like-btn" data-id="${postId}">
                    ❤️ <span class="count">${data.likeCount || 0}</span> Like
                </button>
                <button class="comment-toggle-btn" data-id="${postId}">
                    💬 <span class="count">${data.commentCount || 0}</span> Comment
                </button>
            </div>
            <div class="comments-section" id="comments-${postId}" style="display: none;">
                <div class="comments-list"></div>
                <form class="comment-form">
                    <input type="text" placeholder="Write a comment..." required>
                    <button type="submit" class="btn btn-primary btn-small">Send</button>
                </form>
            </div>
        `;

        // Like logic
        const likeBtn = postCard.querySelector('.like-btn');
        const likeId = `${postId}_${auth.currentUser.uid}`;

        // Check if liked
        db.collection('likes').doc(likeId).get().then(doc => {
            if (doc.exists) likeBtn.classList.add('active');
        }).catch(err => console.error("Error checking like status:", err));

        likeBtn.addEventListener('click', async () => {
            const isLiked = likeBtn.classList.contains('active');
            const batch = db.batch();
            const postRef = db.collection('posts').doc(postId);
            const likeRef = db.collection('likes').doc(likeId);

            if (isLiked) {
                batch.delete(likeRef);
                batch.update(postRef, { likeCount: firebase.firestore.FieldValue.increment(-1) });
                likeBtn.classList.remove('active');
            } else {
                batch.set(likeRef, { postId, uid: auth.currentUser.uid });
                batch.update(postRef, { likeCount: firebase.firestore.FieldValue.increment(1) });
                likeBtn.classList.add('active');
            }
            try {
                await batch.commit();
            } catch (err) {
                console.error("Error toggling like:", err);
                showError("Failed to update like status.");
            }
        });

        // Comment logic
        const commentToggle = postCard.querySelector('.comment-toggle-btn');
        const commentsSection = postCard.querySelector('.comments-section');
        const commentForm = postCard.querySelector('.comment-form');
        const commentsList = postCard.querySelector('.comments-list');

        commentToggle.addEventListener('click', () => {
            const isVisible = commentsSection.style.display === 'block';
            commentsSection.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) loadComments(postId, commentsList);
        });

        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = commentForm.querySelector('input');
            const content = input.value.trim();
            if (!content) return;

            try {
                await db.collection('comments').add({
                    postId,
                    communityId: currentCommunityId,
                    authorUid: auth.currentUser.uid,
                    authorName: currentUserProfile.displayName,
                    content,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await db.collection('posts').doc(postId).update({
                    commentCount: firebase.firestore.FieldValue.increment(1)
                });
                input.value = '';
            } catch (error) {
                console.error(error);
                showError("Failed to post comment.");
            }
        });

        feedContainer.appendChild(postCard);
    }

    function loadComments(postId, container) {
        db.collection('comments')
            .where('postId', '==', postId)
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                container.innerHTML = '';
                snapshot.forEach(doc => {
                    const comment = doc.data();
                    const div = document.createElement('div');
                    div.className = 'comment';
                    div.innerHTML = `<strong>${comment.authorName}</strong> ${comment.content}`;
                    container.appendChild(div);
                });
            }, error => {
                console.error("Comments error:", error);
            });
    }
});
