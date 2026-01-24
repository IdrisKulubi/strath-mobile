import React from 'react';

export const metadata = {
    title: 'Terms of Service - Strathspace',
    description: 'Terms of Service for Strathspace mobile application',
};

export default function TermsPage() {
    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '40px 20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: 1.6,
            color: '#333'
        }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Terms of Service</h1>
            <p style={{ color: '#666', marginBottom: '2rem' }}>Last updated: January 2026</p>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
                <p>
                    By downloading, accessing, or using Strathspace ("the App"), you agree to be bound
                    by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use
                    the App. We reserve the right to modify these Terms at any time, and your continued
                    use of the App constitutes acceptance of any changes.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Eligibility</h2>
                <p>To use Strathspace, you must:</p>
                <ul>
                    <li>Be at least 18 years old</li>
                    <li>Be a current student, staff, or affiliate of a recognized university</li>
                    <li>Have the legal capacity to enter into these Terms</li>
                    <li>Not be prohibited from using the App under applicable laws</li>
                    <li>Not have been previously banned from the platform</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. Account Registration</h2>
                <p>
                    You must create an account to use Strathspace. You agree to provide accurate,
                    current, and complete information during registration and to update such information
                    to keep it accurate, current, and complete. You are responsible for safeguarding
                    your account credentials and for all activities that occur under your account.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#dc2626' }}>4. Community Guidelines & Zero Tolerance Policy</h2>
                <p style={{ fontWeight: 'bold', marginBottom: '1rem' }}>
                    Strathspace maintains a strict zero-tolerance policy for objectionable content and abusive behavior.
                </p>
                <p>You agree NOT to:</p>
                <ul>
                    <li>Post, upload, or share any content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable</li>
                    <li>Share sexually explicit or pornographic content</li>
                    <li>Engage in hate speech, discrimination, or harassment based on race, ethnicity, religion, gender, sexual orientation, disability, or any other characteristic</li>
                    <li>Bully, intimidate, stalk, or threaten other users</li>
                    <li>Impersonate any person or entity</li>
                    <li>Create fake profiles or misrepresent your identity</li>
                    <li>Use the App for any commercial purposes without authorization</li>
                    <li>Spam, solicit, or advertise to other users</li>
                    <li>Attempt to gain unauthorized access to other accounts or systems</li>
                    <li>Share content that promotes violence, self-harm, or illegal activities</li>
                    <li>Post content involving minors in any inappropriate context</li>
                </ul>
                <p style={{ marginTop: '1rem', fontWeight: 'bold', color: '#dc2626' }}>
                    Violation of these guidelines will result in immediate account termination without warning.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>5. User-Generated Content</h2>
                <p>
                    You retain ownership of content you create and share on Strathspace. However, by
                    posting content, you grant us a non-exclusive, worldwide, royalty-free license to
                    use, display, and distribute your content in connection with the App.
                </p>
                <p style={{ marginTop: '1rem' }}>
                    You are solely responsible for your content and the consequences of posting it.
                    We reserve the right to remove any content that violates these Terms or our
                    Community Guidelines.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>6. Reporting & Moderation</h2>
                <p>
                    We provide tools to report objectionable content and abusive users. All reports
                    are reviewed by our moderation team, typically within 24 hours. We take appropriate
                    action based on the severity of the violation, which may include:
                </p>
                <ul>
                    <li>Warning the user</li>
                    <li>Removing the offending content</li>
                    <li>Temporarily suspending the account</li>
                    <li>Permanently banning the user</li>
                    <li>Reporting to law enforcement when required</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>7. Blocking Users</h2>
                <p>
                    You can block any user at any time. Blocked users will not be able to view your
                    profile, send you messages, or interact with you in any way. Blocking is mutual
                    and immediate.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>8. Privacy</h2>
                <p>
                    Your privacy is important to us. Please review our{' '}
                    <a href="/privacy" style={{ color: '#ec4899' }}>Privacy Policy</a> to understand
                    how we collect, use, and protect your personal information.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>9. Safety</h2>
                <p>
                    While we strive to create a safe environment, we cannot guarantee the behavior of
                    other users. You are responsible for your own safety when interacting with others.
                    We recommend:
                </p>
                <ul>
                    <li>Never sharing personal financial information</li>
                    <li>Meeting in public places for first meetings</li>
                    <li>Informing friends or family about your plans</li>
                    <li>Trusting your instincts and reporting suspicious behavior</li>
                </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>10. Intellectual Property</h2>
                <p>
                    The App and its original content, features, and functionality are owned by
                    Strathspace and are protected by international copyright, trademark, and other
                    intellectual property laws. You may not copy, modify, distribute, or create
                    derivative works without our express written permission.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>11. Disclaimers</h2>
                <p>
                    THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
                    WE DO NOT GUARANTEE THAT THE APP WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
                    WE ARE NOT RESPONSIBLE FOR THE CONDUCT OF ANY USER ON OR OFF THE APP.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>12. Limitation of Liability</h2>
                <p>
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, STRATHSPACE SHALL NOT BE LIABLE FOR ANY
                    INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM
                    YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS,
                    GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>13. Termination</h2>
                <p>
                    We may terminate or suspend your account immediately, without prior notice or
                    liability, for any reason, including breach of these Terms. Upon termination,
                    your right to use the App will cease immediately.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>14. Governing Law</h2>
                <p>
                    These Terms shall be governed by and construed in accordance with the laws of
                    Kenya, without regard to its conflict of law provisions.
                </p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>15. Contact Us</h2>
                <p>
                    If you have any questions about these Terms, please contact us at:
                </p>
                <p style={{ marginTop: '0.5rem' }}>
                    <strong>Email:</strong>{' '}
                    <a href="mailto:support@strathspace.com" style={{ color: '#ec4899' }}>
                        support@strathspace.com
                    </a>
                </p>
            </section>

            <footer style={{
                marginTop: '3rem',
                paddingTop: '2rem',
                borderTop: '1px solid #eee',
                textAlign: 'center',
                color: '#666'
            }}>
                <p>© 2026 Strathspace. All rights reserved.</p>
            </footer>
        </div>
    );
}
