import nodemailer from 'nodemailer';

// Use Ethereal Email for testing if no real SMTP is provided, or rely on a mock
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // Port 587 is STARTTLS, so secure must be false
    auth: {
        user: (process.env.SMTP_USER && process.env.SMTP_USER.trim()) || 'raina40@ethereal.email',
        pass: (process.env.SMTP_PASS && process.env.SMTP_PASS.trim()) || 'pUeGMZdHsbyd4FcWW9',
    },
});

export const sendVerificationEmail = async (to: string, token: string) => {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

    const mailOptions = {
        from: '"Food App" <noreply@foodapp.com>',
        to,
        subject: 'Please verify your email address',
        html: `
      <h2>Welcome to Food App!</h2>
      <p>Thank you for registering. Please confirm your email address by clicking the link below:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>If you did not request this, please ignore this email.</p>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending verification email:', error);
        // In dev, we might not have SMTP configured, so don't throw, just log
        return false;
    }
};

export const sendTierUpgradeEmail = async (to: string, tier: string, bonusPoints: number) => {
    const mailOptions = {
        from: '"Food App Loyalty" <loyalty@foodapp.com>',
        to,
        subject: 'Congratulations! You reached a new Loyalty Tier 🏆',
        html: `
      <h2>You are now a ${tier.toUpperCase()} member!</h2>
      <p>Congratulations! You have reached the ${tier} tier in our loyalty program.</p>
      <p>As a reward, we've added <strong>${bonusPoints} bonus points</strong> to your account!</p>
      <p>Enjoy your new perks and keep earning points with every order.</p>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Tier upgrade email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending tier upgrade email:', error);
        return false;
    }
};

export const sendDeliveryEmail = async (to: string, orderId: string) => {
    const mailOptions = {
        from: '"Food App Delivery" <delivery@foodapp.com>',
        to,
        subject: 'Good news! Your order is on its way 🚚',
        html: `
      <h2>Your order #${orderId} is out for delivery!</h2>
      <p>Great news! Our delivery partner has picked up your order and is heading your way.</p>
      <p>Thank you for choosing Food App!</p>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Delivery email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending delivery email:', error);
        return false;
    }
};
