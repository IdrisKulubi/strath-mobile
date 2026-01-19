import React from 'react';

export const metadata = {
    title: 'Privacy Policy - Strathspace',
    description: 'Privacy Policy for Strathspace mobile application',
};

export default function PrivacyPage() {
    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px 20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: 1.6,
            color: '#333'
        }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Privacy Policy</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Last updated: January 2026</p>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Introduction</h2>
                <p>
                    Welcome to Strathspace ("we," "our," or "us"). We are committed to protecting your
                    privacy and ensuring you have a positive experience on our platform. This Privacy
                    Policy explains how we collect, use, disclose, and safeguard your information when
                    you use our mobile application.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Information We Collect</h2>

                <h3 style={{ fontSize: '1.2rem', marginTop: '1rem' }}>Account Information</h3>
                <p>When you sign up using Google Sign-In, we collect:</p>
                <ul>
                    <li>Name</li>
                    <li>Email address</li>
                    <li>Profile picture (from your Google account)</li>
                </ul>

                <h3 style={{ fontSize: '1.2rem', marginTop: '1rem' }}>Profile Information</h3>
                <p>Information you provide to create your profile:</p>
                <ul>
                    <li>Bio and personal description</li>
                    <li>Photos you upload</li>
                    <li>Interests and preferences</li>
                    <li>University/campus affiliation</li>
                    <li>Course of study</li>
                    <li>Year of study</li>
                </ul>

                <h3 style={{ fontSize: '1.2rem', marginTop: '1rem' }}>Usage Data</h3>
                <p>We automatically collect certain information when you use the app:</p>
                <ul>
                    <li>Interactions with other users (likes, passes)</li>
                    <li>Messages sent through the platform</li>
                    <li>App usage patterns and preferences</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. How We Use Your Information</h2>
                <p>We use your information to:</p>
                <ul>
                    <li>Create and manage your account</li>
                    <li>Connect you with other users on campus</li>
                    <li>Provide personalized recommendations</li>
                    <li>Enable messaging between matched users</li>
                    <li>Improve our services and user experience</li>
                    <li>Ensure the safety and security of our platform</li>
                    <li>Comply with legal obligations</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>4. Information Sharing</h2>
                <p>We do not sell your personal information. We may share your information:</p>
                <ul>
                    <li><strong>With other users:</strong> Your profile information is visible to other Strathspace users</li>
                    <li><strong>Service providers:</strong> We use third-party services (hosting, analytics) that may process your data</li>
                    <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>5. Data Security</h2>
                <p>
                    We implement appropriate technical and organizational measures to protect your
                    personal information. However, no method of transmission over the Internet is
                    100% secure, and we cannot guarantee absolute security.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>6. Your Rights</h2>
                <p>You have the right to:</p>
                <ul>
                    <li>Access your personal data</li>
                    <li>Correct inaccurate information</li>
                    <li>Delete your account and associated data</li>
                    <li>Withdraw consent at any time</li>
                    <li>Request a copy of your data</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>7. Data Retention</h2>
                <p>
                    We retain your information for as long as your account is active or as needed to
                    provide services. When you delete your account, we will delete or anonymize your
                    personal information within 30 days, unless retention is required for legal purposes.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>8. Third-Party Services</h2>
                <p>Our app uses the following third-party services:</p>
                <ul>
                    <li><strong>Google Sign-In:</strong> For authentication</li>
                    <li><strong>Vercel:</strong> For hosting and infrastructure</li>
                    <li><strong>Cloudinary/UploadThing:</strong> For image storage</li>
                </ul>
                <p>Each service has its own privacy policy governing their use of your data.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>9. Children's Privacy</h2>
                <p>
                    Strathspace is intended for users who are at least 18 years old. We do not
                    knowingly collect personal information from users under 18. If we become aware
                    that we have collected data from a user under 18, we will delete it promptly.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>10. Changes to This Policy</h2>
                <p>
                    We may update this Privacy Policy from time to time. We will notify you of any
                    changes by posting the new Privacy Policy on this page and updating the "Last
                    updated" date.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>11. Contact Us</h2>
                <p>
                    If you have any questions about this Privacy Policy or our data practices,
                    please contact us at:
                </p>
                <p style={{ marginTop: '1rem' }}>
                    <strong>Email:</strong> support@strathspace.com<br />
                    <strong>App:</strong> Strathspace
                </p>
            </section>

            <footer style={{
                marginTop: '3rem',
                paddingTop: '2rem',
                borderTop: '1px solid #eee',
                color: '#666',
                fontSize: '0.9rem'
            }}>
                <p>© 2026 Strathspace. All rights reserved.</p>
            </footer>
        </div>
    );
}
