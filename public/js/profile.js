// Profile Management Logic for ADA

document.addEventListener('DOMContentLoaded', () => {
    const profileForm = document.getElementById('profile-setup-form');
    const photoInput = document.getElementById('profile-photo-input');
    const uploadBtn = document.getElementById('upload-photo-btn');
    const photoPreview = document.getElementById('photo-preview');

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            logStep('Profile loading', 'No user found, redirecting to index');
            window.location.href = 'index.html';
            return;
        }

        try {
            logStep('Profile loading', 'Checking for existing profile');
            // Check if user already has a profile to pre-fill
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                logStep('Profile loading', 'Found existing profile, pre-filling form');
                const data = userDoc.data();
                const nameEl = document.getElementById('display-name');
                const resEl = document.getElementById('country-residence');
                const herEl = document.getElementById('country-heritage');
                const bioEl = document.getElementById('user-bio');

                if (nameEl) nameEl.value = data.displayName || '';
                if (resEl) resEl.value = data.countryOfResidence || '';
                if (herEl) herEl.value = data.heritageCountry || '';
                if (bioEl) bioEl.value = data.bio || '';
                if (data.photoURL && photoPreview) photoPreview.src = data.photoURL;
            } else {
                logStep('Profile loading', 'No existing profile found');
            }
        } catch (error) {
            console.error("Profile check error:", error);
            showError("Failed to load profile data.");
        }
    });

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (photoInput) photoInput.click();
        });
    }

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (photoPreview) photoPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const nameEl = document.getElementById('display-name');
            const resEl = document.getElementById('country-residence');
            const herEl = document.getElementById('country-heritage');
            const bioEl = document.getElementById('user-bio');

            const displayName = nameEl ? nameEl.value : '';
            const countryOfResidence = resEl ? resEl.value : '';
            const heritageCountry = herEl ? herEl.value : '';
            const bio = bioEl ? bioEl.value : '';
            const photoFile = photoInput ? photoInput.files[0] : null;

            let photoURL = (photoPreview && photoPreview.src.includes('default-avatar.png')) ? '' : (photoPreview ? photoPreview.src : '');

            const submitBtn = profileForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            try {
                logStep('Profile loading', 'Saving profile data...');
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

                logStep('Profile loading', 'Profile saved successfully');
                window.location.href = 'communities.html';
            } catch (error) {
                console.error("Error saving profile:", error);
                showError("Error saving profile: " + error.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Save and Continue';
                }
            }
        });
    }
});
