import nodemailer from 'nodemailer';
import { ApiError } from './ApiError.js';

const sendEmail = async (options) => {
  // Validate environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new ApiError(500, "Email service not properly configured");
  }

  // Create a transporter with more detailed configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false // Helps with self-signed certificates in development
    }
  });

  // Verify connection configuration with better error handling
  try {
    await transporter.verify();
    console.log('Email transporter verified successfully');
  } catch (error) {
    console.error('Email transporter verification failed:', error);
    if (error.code === 'EAUTH') {
      throw new ApiError(500, "Email authentication failed. Check credentials or enable less secure apps in Gmail.");
    } else if (error.code === 'ESOCKET') {
      throw new ApiError(500, "Network error connecting to email server. Check your internet connection.");
    } else if (error.code === 'ECONNECTION') {
      throw new ApiError(500, "Connection to email server failed. Server might be down or blocked.");
    }
    throw new ApiError(500, `Email service configuration error: ${error.message}`);
  }

  const mailOptions = {
    from: `RoadResQ <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // Send email with better error handling
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.code === 'EENVELOPE') {
      throw new ApiError(500, "Invalid recipient email address");
    } else if (error.code === 'EMESSAGE') {
      throw new ApiError(500, "Error in message format");
    }
    throw new ApiError(500, `Failed to send email: ${error.message}`);
  }
};

export default sendEmail;