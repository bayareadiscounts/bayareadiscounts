const { EmailClient } = require('@azure/communication-email');
const { getSecret, appInsights } = require('../shared/init');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type, authorization, ocp-apim-subscription-key'
      }
    };
    return;
  }

  const body = req.body || {};
  const to = body.to;
  const subject = body.subject || 'Notification';
  const content = body.content || '';
  const replyTo = body.replyTo;

  if (!to || !content) {
    context.res = {
      status: 400,
      body: { error: 'Missing required fields: to, content' }
    };
    return;
  }

  try {
    // Get ACS connection string from Key Vault or environment
    const connectionString = await getSecret('acs-connection-string', 'ACS_CONNECTION_STRING');
    if (!connectionString) {
      throw new Error('ACS connection string not configured');
    }

    const client = new EmailClient(connectionString);

    const message = {
      senderAddress: process.env.ACS_SENDER_ADDRESS || 'donotreply@bayareadiscounts.com',
      content: {
        subject,
        plainText: content,
        html: renderBrandedHtml({ subject, content })
      },
      recipients: {
        to: [{ email: to }]
      }
    };

    if (replyTo) {
      message.replyTo = [{ email: replyTo }];
    }

    const response = await client.send(message);
    appInsights.defaultClient?.trackEvent({ name: 'EmailSent', properties: { to } });

    context.res = {
      status: 202,
      body: { messageId: response?.messageId || null, status: 'Accepted' }
    };
  } catch (err) {
    context.log.error('SendEmail error:', err);
    appInsights.defaultClient?.trackException({ exception: err });
    context.res = {
      status: 500,
      body: { error: 'Email send failed' }
    };
  }
};

// Simple branded HTML wrapper for outbound email bodies.
function renderBrandedHtml({ subject, content }) {
  const escapedBody = escapeHtml(content).replace(/\n/g, '<br>');
  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://bayareadiscounts.com';
  const logoUrl = `${baseUrl}/assets/images/logo/banner.svg`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="x-ua-compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fa;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f8fa;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="width:640px;max-width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td align="center" style="background:#00353b;">
              <a href="${baseUrl}" style="display:block;padding:18px 20px;">
                <img src="${logoUrl}" alt="Bay Area Discounts" style="max-width:100%;height:auto;display:block;" width="600" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;color:#1f2933;font-family:Segoe UI,Arial,sans-serif;line-height:1.6;font-size:15px;">
              ${escapedBody}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 20px 18px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-family:Segoe UI,Arial,sans-serif;font-size:12px;">
              <span>© ${new Date().getFullYear()} Bay Area Discounts</span>
              &nbsp;•&nbsp;
              <a href="${baseUrl}" style="color:#00acc1;text-decoration:underline;">Visit Site</a>
              &nbsp;•&nbsp;
              <a href="${baseUrl}/privacy.html" style="color:#00acc1;text-decoration:underline;">Privacy</a>
              &nbsp;•&nbsp;
              <a href="${baseUrl}/terms.html" style="color:#00acc1;text-decoration:underline;">Terms</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
