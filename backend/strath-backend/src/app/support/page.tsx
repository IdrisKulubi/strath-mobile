export const metadata = {
    title: 'Support - Strathspace',
    description: 'Get help and support for Strathspace mobile application',
};

export default function SupportPage() {
    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px 20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: 1.6,
            color: '#333'
        }}>
            <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#1a1a2e' }}>
                Strathspace Support
            </h1>
            <p style={{ color: '#666', marginBottom: '40px' }}>
                We're here to help you get the most out of your campus community experience.
            </p>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#1a1a2e' }}>
                    📧 Contact Us
                </h2>
                <p>
                    For any questions, feedback, or issues with the Strathspace app, please reach out to us:
                </p>
                <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
                    <li style={{ marginBottom: '8px' }}>
                        <strong>Email:</strong>{' '}
                        <a href="mailto:support@strathspace.com" style={{ color: '#e91e8c' }}>
                            support@strathspace.com
                        </a>
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        <strong>Response Time:</strong> We typically respond within 24-48 hours
                    </li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#1a1a2e' }}>
                    ❓ Frequently Asked Questions
                </h2>

                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                        How do I sign up for Strathspace?
                    </h3>
                    <p style={{ color: '#555' }}>
                        Download the app from the App Store and sign in with your Google account.
                        For the best experience, use your  University email.
                    </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                        How do I edit my profile?
                    </h3>
                    <p style={{ color: '#555' }}>
                        Go to the Profile tab, then tap the edit button to update your bio, photos,
                        interests, and other details.
                    </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                        How do I report a user or content?
                    </h3>
                    <p style={{ color: '#555' }}>
                        Tap the three-dot menu on any profile or in a chat conversation, then select
                        "Report" to flag inappropriate content or behavior. Our team reviews all reports.
                    </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                        How do I delete my account?
                    </h3>
                    <p style={{ color: '#555' }}>
                        Go to Profile → Settings → Delete Account. This action is permanent and will
                        remove all your data from our servers.
                    </p>
                </div>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#1a1a2e' }}>
                    🔒 Privacy & Safety
                </h2>
                <p>
                    Your safety is our priority. Read our{' '}
                    <a href="/privacy" style={{ color: '#e91e8c' }}>Privacy Policy</a>{' '}
                    to learn how we protect your data.
                </p>
                <p style={{ marginTop: '12px' }}>
                    If you encounter any safety concerns, please report them immediately through
                    the app or email us directly.
                </p>
            </section>

            <section style={{
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '1px solid #eee',
                color: '#666',
                fontSize: '14px'
            }}>
                <p>
                    <strong>Strathspace</strong> - Connecting Strathmore University students
                </p>
                <p style={{ marginTop: '8px' }}>
                    © 2026 Vehemgroup. All rights reserved.
                </p>
            </section>
        </div>
    );
}
