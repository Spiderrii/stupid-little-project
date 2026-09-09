const crypto = require('crypto');

const CODE_TTL_SECONDS = 5 * 60; // 5 minutes

function isValidEmail(raw) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}

function buildToken(contact, code, exp, secret) {
  const codeHash = crypto.createHash('sha256').update(`${contact}.${code}.${exp}.${secret}`).digest('hex');
  const payload = `${contact}.${exp}.${codeHash}`;
  const outerSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${contact}.${exp}.${codeHash}.${outerSig}`).toString('base64url');
}

function buildEmailHtml(code) {
  // Table-based layout with all styles inline — the safest approach for
  // consistent rendering across email clients (Gmail, Outlook, Apple Mail
  // all strip or mangle <style> blocks to varying degrees).
  return `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; background-color:#ffffff; border:1px solid #e5e5e5; border-radius:8px; overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <p style="margin:0; font-size:13px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:#8a8a8a;">Verification code</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0 32px;">
              <h1 style="margin:0; font-size:20px; font-weight:600; color:#111111; letter-spacing:-0.01em;">Confirm it's you</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 32px 0 32px;">
              <p style="margin:0; font-size:14px; line-height:1.6; color:#555555;">
                Use the code below to finish verifying your email address. This code is valid for 5 minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 4px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#f7f7f7; border:1px solid #e5e5e5; border-radius:6px; padding:18px 0;">
                    <span style="font-family:'SF Mono','Courier New',monospace; font-size:32px; font-weight:700; letter-spacing:0.28em; color:#111111;">${code}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0 32px;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#8a8a8a;">
                If you didn't request this code, you can safely ignore this email — no action is needed.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 28px 32px; border-top:1px solid #f0f0f0; margin-top:24px;">
              <p style="margin:16px 0 0 0; font-size:12px; color:#b5b5b5;">
                This is an automated message, please don't reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { contact } = req.body || {};
  if (!contact || typeof contact !== 'string' || !isValidEmail(contact)) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }

  const { RESEND_API_KEY, OTP_SECRET } = process.env;
  if (!RESEND_API_KEY || !OTP_SECRET) {
    res.status(500).json({ error: 'Server is missing required environment variables.' });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const exp = Date.now() + CODE_TTL_SECONDS * 1000;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Resend's sandbox sender — only delivers to the address you
        // signed up to Resend with, until a domain is verified.
        from: 'onboarding@resend.dev',
        to: contact,
        subject: `${code} is your verification code`,
        html: buildEmailHtml(code),
        text: `Your verification code is ${code}. It expires in 5 minutes. If you didn't request this, you can ignore this email.`
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.message || 'Resend could not send the email.');
    }
  } catch (err) {
    res.status(502).json({ error: 'Could not send the email: ' + (err.message || 'unknown error') });
    return;
  }

  res.status(200).json({
    token: buildToken(contact, code, exp, OTP_SECRET),
    contact,
    // Demo convenience only — lets the on-page toast show the real code
    // without checking the inbox. Remove this field if this stops being
    // a for-fun demo and needs to behave like a real verification flow.
    code
  });
};
