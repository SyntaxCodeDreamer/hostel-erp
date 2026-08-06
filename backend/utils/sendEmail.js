const getBrevoDefaultPassword = (email) => {
  if (!email) return 'hostel1923';
  const clean = email.trim().toLowerCase();
  const localPart = clean.split('@')[0];
  const firstFive = localPart.length >= 5 ? localPart.substring(0, 5) : localPart;
  return `${firstFive}1923`;
};

const getMaskedPassword = (pass) => {
  return '••••••••••••';
};

const sendWelcomeEmail = async ({ name, email, role, password }) => {
  const apiKey = process.env.BREVO_API;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey) {
    console.warn('BREVO_API key is not configured in .env file.');
    return false;
  }

  const finalPassword = password || getBrevoDefaultPassword(email);
  const maskedPassword = getMaskedPassword(finalPassword);
  const localPart = (email || '').split('@')[0];
  const sampleFive = localPart.length >= 5 ? localPart.substring(0, 5) : localPart;

  const payload = {
    sender: {
      name: 'Hostel ERP System',
      email: senderEmail
    },
    to: [
      {
        email: email,
        name: name || email
      }
    ],
    subject: `Welcome to Hostel Management Portal – Your Account Details`,
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
        <!-- Brand Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Welcome to Hostel Management Portal</h1>
        </div>

        <!-- Body Content -->
        <div style="padding: 28px 24px; background-color: #ffffff;">
          <p style="font-size: 16px; color: #0f172a; margin-top: 0;">Dear <strong>${name || 'Resident'}</strong>,</p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6;">
            Welcome to the <strong>Hostel Management Portal</strong>.
          </p>
          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
            Your account has been successfully created.
          </p>

          <!-- Login Credentials Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: #4f46e5; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px;">
              Login Credentials
            </h3>
            <table style="width: 100%; font-size: 14px; color: #1e293b; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: 700; width: 160px; color: #475569;">Portal URL:</td>
                <td style="padding: 6px 0;">
                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" target="_blank" style="color: #4f46e5; font-weight: 600; text-decoration: none;">
                    ${process.env.FRONTEND_URL || 'http://localhost:5173'}
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 700; color: #475569;">User ID:</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #0f172a;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: 700; color: #475569;">Temporary Password:</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #64748b; font-size: 15px;">
                  •••••••••••• <span style="font-size: 12px; font-weight: normal; color: #64748b;">(Protected for Security)</span>
                </td>
              </tr>
            </table>

            <!-- Password Generation Instructions (Matching Screenshot Style) -->
            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin-top: 16px;">
              <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #000066;">
                Password Security Instruction
              </h4>
              <p style="margin: 0 0 14px 0; font-size: 14px; color: #334155; line-height: 1.5;">
                For security reasons, your temporary password is not displayed in plain text. Take the first 5 letters of your Email ID (in lowercase, without spaces or special characters) + <strong>1923</strong>.
              </p>
              <div style="font-size: 14px; color: #334155; line-height: 1.8;">
                <p style="margin: 0 0 6px 0;">
                  <span style="color: #dc2626; font-weight: bold; margin-right: 6px;">❖</span>
                  If your Email ID is <strong>${email}</strong> &rarr; your password is <strong>${sampleFive}1923</strong>
                </p>
                <p style="margin: 0;">
                  <span style="color: #dc2626; font-weight: bold; margin-right: 6px;">❖</span>
                  Password Rule: <strong>[First 5 letters of Email ID] + 1923</strong>
                </p>
              </div>
            </div>
          </div>

          <!-- Security Instructions Box -->
          <div style="border: 1px solid #e2e8f0; background-color: #ffffff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
              Important Security Instructions
            </h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.7;">
              <li>This password is temporary and must be changed after your first login.</li>
              <li>Do not share your login credentials with anyone.</li>
              <li>If you forget your password, use the <strong>Forgot Password</strong> option on the login page.</li>
              <li>Contact the Hostel Administrator if you experience any login issues.</li>
            </ul>
          </div>

          <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-bottom: 24px;">
            We hope this portal makes hostel communication and management easier.
          </p>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #475569;">Regards,</p>
            <p style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">Hostel Administration Team</p>
            <p style="margin: 2px 0 0 0; font-size: 13px; color: #64748b;">Hostel Management Portal</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`Welcome email sent to ${email} via Brevo. Message ID:`, data.messageId);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`Failed to send email via Brevo to ${email}. Status: ${response.status}`, errorText);
      return false;
    }
  } catch (error) {
    console.error('Error sending welcome email via Brevo:', error.message);
    return false;
  }
};

module.exports = {
  getBrevoDefaultPassword,
  sendWelcomeEmail
};
