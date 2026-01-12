// Re-exporting Login as the primary Auth entry point for consistency.
// In this new "Duolingo-style" flow, both /login and /register lead to the same
// "Welcome Screen" where the user chooses "Get Started" or "I have an account".
// This simplifies the codebase and ensures a unified entry experience.

import LoginScreen from './login';

export default function RegisterScreen() {
    return <LoginScreen />;
}
