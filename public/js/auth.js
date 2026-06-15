// Authentication Logic for ADA

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const googleBtn = document.getElementById('google-signin-btn');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');

    // Toggle Forms
    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginContainer.style.display = 'none';
            registerContainer.style.display = 'block';
        });
    }

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerContainer.style.display = 'none';
            loginContainer.style.display = 'block';
        });
    }

    // Email/Password Register
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            if (password !== confirmPassword) {
                alert("Passwords do not match");
                return;
            }

            try {
                await auth.createUserWithEmailAndPassword(email, password);
                // Auth state observer in app.js will handle redirect
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        });
    }

    // Email/Password Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        });
    }

    // Google Sign In
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await auth.signInWithPopup(provider);
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        });
    }
});
