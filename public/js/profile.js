// Profile Management Logic for ADA

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-setup-form');
    const photoInput = document.getElementById('profile-photo-input');
    const uploadBtn = document.getElementById('upload-photo-btn');
    const photoPreview = document.getElementById('photo-preview');

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Check if user already has a profile to pre-fill
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            document.getElementById('display-name').value = data.displayName || '';
            document.getElementById('country-residence').value = data.countryOfResidence || '';
            document.getElementById('country-heritage').value = data.heritageCountry || '';
            document.getElementById('user-bio').value = data.bio || '';
            if (data.photoURL) photoPreview.src = data.photoURL;
        }
    });

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => photoInput.click());
    }

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => photoPreview.src = e.target.result;
                reader.readAsDataURL(file);
            }
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const displayName = document.getElementById('display-name').value;
            const countryOfResidence = document.getElementById('country-residence').value;
            const heritageCountry = document.getElementById('country-heritage').value;
            const bio = document.getElementById('user-bio').value;
            const photoFile = photoInput.files[0];

            let photoURL = photoPreview.src.includes('default-avatar.png') ? '' : photoPreview.src;

            try {
                // Upload photo if new one selected
                if (photoFile) {
                    const storageRef = storage.ref(`profiles/${user.uid}/photo`);
                    await storageRef.put(photoFile);
                    photoURL = await storageRef.getDownloadURL();
                }

                const userData = {
                    uid: user.uid,
                    displayName,
                    email: user.email,
                    photoURL,
                    countryOfResidence,
                    heritageCountry,
                    bio,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Create or Update
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('users').doc(user.uid).set(userData);
                } else {
                    await db.collection('users').doc(user.uid).update(userData);
                }

                window.location.href = 'communities.html';
            } catch (error) {
                console.error(error);
                alert("Error saving profile: " + error.message);
            }
        });
    }
});
