// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpCIXMZqeFT0Q_YCAlGZ2RxjLgmQn4MDA",
  authDomain: "ada-social.firebaseapp.com",
  projectId: "ada-social",
  storageBucket: "ada-social.firebasestorage.app",
  messagingSenderId: "390267113139",
  appId: "1:390267113139:web:39bf5cb5523c2576562ac6"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
