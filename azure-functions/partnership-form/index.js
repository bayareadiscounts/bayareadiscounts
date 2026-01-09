const { EmailClient } = require('@azure/communication-email');

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://baynavigator.org',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// Rate limiting: simple in-memory store (resets on function restart)
const submissions = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_IP = 3;

function isRateLimited(ip) {
  const now = Date.now();
  const record = submissions.get(ip);

  if (!record) {
    submissions.set(ip, { count: 1, firstSubmission: now });
    return false;
  }

  // Reset if window has passed
  if (now - record.firstSubmission > RATE_LIMIT_WINDOW) {
    submissions.set(ip, { count: 1, firstSubmission: now });
    return false;
  }

  if (record.count >= MAX_SUBMISSIONS_PER_IP) {
    return true;
  }

  record.count++;
  return false;
}

// Basic input validation and sanitization
function sanitize(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: corsHeaders,
    };
    return;
  }

  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-client-ip'] || 'unknown';

  // Rate limiting check
  if (isRateLimited(clientIp)) {
    context.res = {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Too many submissions. Please try again later.',
      }),
    };
    return;
  }

  try {
    const body = req.body || {};

    // Extract and validate fields
    const orgName = sanitize(body.orgName, 200);
    const orgUrl = sanitize(body.orgUrl, 500);
    const contactName = sanitize(body.contactName, 100);
    const contactEmail = sanitize(body.contactEmail, 254);
    const contactPhone = sanitize(body.contactPhone, 20);
    const orgType = sanitize(body.orgType, 50);
    const partnershipType = sanitize(body.partnershipType, 50);
    const message = sanitize(body.message, 2000);

    // Validation
    const errors = [];

    if (!orgName) errors.push('Organization name is required');
    if (!orgUrl) errors.push('Organization URL is required');
    else if (!isValidUrl(orgUrl)) errors.push('Invalid organization URL');
    if (!contactName) errors.push('Contact name is required');
    if (!contactEmail) errors.push('Contact email is required');
    else if (!isValidEmail(contactEmail)) errors.push('Invalid email format');
    if (!orgType) errors.push('Organization type is required');
    if (!partnershipType) errors.push('Partnership type is required');
    if (!message) errors.push('Message is required');

    if (errors.length > 0) {
      context.res = {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, errors }),
      };
      return;
    }

    // Build email content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #0d9488; border-bottom: 2px solid #0d9488; padding-bottom: 10px; }
    .field { margin-bottom: 16px; }
    .label { font-weight: bold; color: #555; }
    .value { margin-top: 4px; }
    .message { background: #f3f4f6; padding: 16px; border-radius: 8px; margin-top: 8px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1>New Partnership Inquiry</h1>

    <div class="field">
      <div class="label">Organization Name</div>
      <div class="value">${escapeHtml(orgName)}</div>
    </div>

    <div class="field">
      <div class="label">Organization URL</div>
      <div class="value"><a href="${escapeHtml(orgUrl)}">${escapeHtml(orgUrl)}</a></div>
    </div>

    <div class="field">
      <div class="label">Organization Type</div>
      <div class="value">${escapeHtml(orgType)}</div>
    </div>

    <div class="field">
      <div class="label">Partnership Type</div>
      <div class="value">${escapeHtml(partnershipType)}</div>
    </div>

    <h2 style="margin-top: 24px; color: #374151;">Contact Information</h2>

    <div class="field">
      <div class="label">Name</div>
      <div class="value">${escapeHtml(contactName)}</div>
    </div>

    <div class="field">
      <div class="label">Email</div>
      <div class="value"><a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a></div>
    </div>

    ${
      contactPhone
        ? `
    <div class="field">
      <div class="label">Phone</div>
      <div class="value">${escapeHtml(contactPhone)}</div>
    </div>
    `
        : ''
    }

    <h2 style="margin-top: 24px; color: #374151;">Message</h2>
    <div class="message">${escapeHtml(message).replace(/\n/g, '<br>')}</div>

    <div class="footer">
      <p>This inquiry was submitted via the Bay Navigator partnerships page.</p>
      <p>Submitter IP: ${escapeHtml(clientIp)}</p>
      <p>Submitted at: ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>`;

    const emailText = `
New Partnership Inquiry
========================

Organization Name: ${orgName}
Organization URL: ${orgUrl}
Organization Type: ${orgType}
Partnership Type: ${partnershipType}

Contact Information
-------------------
Name: ${contactName}
Email: ${contactEmail}
${contactPhone ? `Phone: ${contactPhone}` : ''}

Message
-------
${message}

---
Submitted via Bay Navigator partnerships page
Submitter IP: ${clientIp}
Submitted at: ${new Date().toISOString()}
`;

    // Send email via Azure Communication Services
    const connectionString = process.env.AZURE_COMMS_CONNECTION_STRING;
    const senderEmail = process.env.AZURE_COMMS_SENDER;
    const recipientEmail = process.env.PARTNERSHIP_EMAIL;

    if (!connectionString || !senderEmail || !recipientEmail) {
      throw new Error('Email configuration missing');
    }

    const emailClient = new EmailClient(connectionString);

    const emailMessage = {
      senderAddress: senderEmail,
      content: {
        subject: `Partnership Inquiry: ${orgName}`,
        plainText: emailText,
        html: emailHtml,
      },
      recipients: {
        to: [{ address: recipientEmail }],
      },
      replyTo: [{ address: contactEmail, displayName: contactName }],
    };

    const poller = await emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();

    if (result.status === 'Succeeded') {
      context.res = {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Thank you! Your partnership inquiry has been submitted.',
        }),
      };
    } else {
      throw new Error(`Email sending failed with status: ${result.status}`);
    }
  } catch (error) {
    context.log.error('Partnership form error:', error);

    context.res = {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'An error occurred. Please try again or email us directly.',
      }),
    };
  }
};

// HTML escape helper to prevent XSS
function escapeHtml(str) {
  const htmlEntities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}
