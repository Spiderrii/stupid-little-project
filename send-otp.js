const crypto = require('crypto');

const CODE_TTL_SECONDS = 5 * 60; // 5 minutes

function buildToken(email, code, exp, secret) {
  const codeHash = crypto.createHash('sha256').update(`${email}.${code}.${exp}.${secret}`).digest('hex');
  const payload = `${email}.${exp}.${codeHash}`;
  const outerSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${email}.${exp}.${codeHash}.${outerSig}`).toString('base64url');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
        // Resend's shared sandbox sender — works without verifying your
        // own domain, but only delivers to the address you signed up
        // with until a domain is verified. Fine for personal testing.
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Your verification code',
        text: `Your verification code is ${code}. It expires in 5 minutes.`
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
    token: buildToken(email, code, exp, OTP_SECRET),
    email
  });
};
