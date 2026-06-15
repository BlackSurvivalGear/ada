// Seed Loader for ADA
// To be used by developers for testing

async function seedDemoData() {
    const response = await fetch('seed-data.json');
    const data = await response.json();

    console.log("Seeding data...");

    // This is for demonstration. In a real environment, you'd use a service account or admin SDK.
    // Here we just show how the data structure looks.

    for (const user of data.users) {
        await db.collection('users').doc(user.uid).set({
            ...user,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    for (const comm of data.communities) {
        await db.collection('communities').doc(comm.id).set({
            ...comm,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Add membership for owner
        await db.collection('memberships').doc(`${comm.id}_${comm.ownerUid}`).set({
            communityId: comm.id,
            uid: comm.ownerUid,
            role: 'Owner',
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    for (const post of data.posts) {
        await db.collection('posts').add({
            ...post,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    console.log("Seeding complete!");
}

// Attach to window for easy access in console
window.seedDemoData = seedDemoData;
