const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Send task creation notification email
const sendTaskCreationEmail = async (userEmail, userName, taskTitle, taskDate, taskDescription) => {
  try {
    // Check if email credentials are configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('Email service not configured. Skipping email notification.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"To-Do App" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: `New Task Created: ${taskTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Task Created Successfully!</h2>
          <p>Hello ${userName},</p>
          <p>You have created a new task:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1976d2;">${taskTitle}</h3>
            ${taskDescription ? `<p style="color: #666;">${taskDescription}</p>` : ''}
            <p style="color: #666;"><strong>Date:</strong> ${taskDate}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Good luck with your task!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This is an automated notification from your To-Do App.</p>
        </div>
      `,
      text: `
        Task Created Successfully!
        
        Hello ${userName},
        
        You have created a new task:
        
        ${taskTitle}
        ${taskDescription ? `\n${taskDescription}` : ''}
        Date: ${taskDate}
        
        Good luck with your task!
        
        This is an automated notification from your To-Do App.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Task creation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending task creation email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendTaskCreationEmail
};

