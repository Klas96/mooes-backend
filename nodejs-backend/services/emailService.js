const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    // Check for both EMAIL_PASSWORD and EMAIL_PASS environment variables
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
    
    if (!process.env.EMAIL_USER || !emailPassword) {
      console.error('Email service is not configured. Please set EMAIL_USER and EMAIL_PASSWORD/EMAIL_PASS environment variables.');
      console.error('Current environment variables:');
      console.error('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
      console.error('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
      console.error('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
      this.transporter = null;
      return;
    }

    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'mailcluster.loopia.se',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true' || false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: emailPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    console.log('Email service initialized with:', {
      host: process.env.EMAIL_HOST || 'mailcluster.loopia.se',
      port: process.env.EMAIL_PORT || 587,
      user: process.env.EMAIL_USER,
      passwordSet: !!emailPassword
    });
  }

  // Generate verification token (for backward compatibility)
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate verification code (6 digits)
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Reinitialize transporter if environment variables are now available
  _ensureTransporter() {
    if (!this.transporter) {
      const emailPassword = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS;
      if (process.env.EMAIL_USER && emailPassword) {
        // Reinitialize transporter now that env vars are available
        this.transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'mailcluster.loopia.se',
          port: process.env.EMAIL_PORT || 587,
          secure: process.env.EMAIL_SECURE === 'true' || false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: emailPassword
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        console.log('Email service reinitialized with:', {
          host: process.env.EMAIL_HOST || 'mailcluster.loopia.se',
          port: process.env.EMAIL_PORT || 587,
          user: process.env.EMAIL_USER,
          passwordSet: !!emailPassword
        });
      }
    }
  }

  // Send verification email with code
  async sendVerificationEmail(email, firstName, verificationCode) {
    this._ensureTransporter();
    if (!this.transporter) {
      console.error('Email transporter not configured. Cannot send verification email.');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@your-app.com',
      to: email,
      subject: 'Verify Your Email - Mooves',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2E7D32; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to Mooves!</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2>Hi ${firstName},</h2>
            <p>Thank you for registering with Mooves! To complete your registration, please enter the verification code below in your app:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #4CAF50; color: white; padding: 20px; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
                ${verificationCode}
              </div>
            </div>
            
            <p><strong>Verification Code:</strong> ${verificationCode}</p>
            
            <p>Enter this code in your Mooves app to verify your email address.</p>
            
            <p>This verification code will expire in 10 minutes.</p>
            
            <p>If you didn't create an account with Mooves, you can safely ignore this email.</p>
            
            <p>Best regards,<br>The Mooves Team</p>
          </div>
          
          <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>© 2024 Mooves. All rights reserved.</p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  // Send password reset email (for future use)
  async sendPasswordResetEmail(email, firstName, resetToken) {
    this._ensureTransporter();
    if (!this.transporter) {
      console.error('Email transporter not configured. Cannot send password reset email.');
      return false;
    }

    // Create reset URL - can be customized based on your domain
    const resetUrl = `https://mooves.klasholmgren.se/reset-password?token=${resetToken}`;
    const appDeepLink = `mooves://reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@your-app.com',
      to: email,
      subject: 'Reset Your Password - Mooves',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2E7D32; color: white; padding: 20px; text-align: center;">
            <h1>Password Reset Request</h1>
          </div>
          
          <div style="padding: 20px; background-color: #f9f9f9;">
            <h2>Hi ${firstName},</h2>
            <p>We received a request to reset your password for your Mooves account.</p>
            
            <div style="background-color: #e8f5e8; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #2E7D32; margin-top: 0;">🔒 Reset Your Password</h3>
              <p style="color: #333;">Click the button below to reset your password:</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; text-align: center;">
                Or copy and paste this link in your browser:<br>
                <a href="${resetUrl}" style="color: #2E7D32; word-break: break-all;">${resetUrl}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
              
              <p style="font-size: 14px; color: #666;">
                <strong>Using the mobile app?</strong> You can also enter this token manually in the app:
              </p>
              <div style="text-align: center; margin: 15px 0;">
                <code style="background-color: #fff; color: #2E7D32; padding: 10px 15px; border-radius: 5px; font-size: 16px; font-weight: bold; letter-spacing: 1px; display: inline-block; border: 2px dashed #4CAF50;">
                  ${resetToken}
                </code>
              </div>
            </div>
            
            <p><strong>⏱️ Important:</strong> This reset link will expire in 1 hour for security reasons.</p>
            
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p>Best regards,<br>The Mooves Team</p>
          </div>
          
          <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 5px 0;">© 2025 Mooves. All rights reserved.</p>
            <p style="margin: 5px 0;">
              <a href="https://mooves.se/privacy-policy" style="color: #4CAF50; text-decoration: none;">Privacy Policy</a> | 
              <a href="https://mooves.se/terms" style="color: #4CAF50; text-decoration: none;">Terms of Service</a>
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 