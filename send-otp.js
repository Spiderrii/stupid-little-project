const crypto = require('crypto');

const CODE_TTL_SECONDS = 5 * 60; // 5 minutes

function toE164(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits[0] === '1') return '+' + digits;
  if (raw.trim().startsWith('+') && digits.length > 7) return '+' + digits;
  return null;
}

// Builds a token that lets verify-otp check a submitted code against what
// was actually texted, without the server storing the code anywhere.
function buildToken(phone, code, exp, secret) {
  const codeHash = crypto.createHash('sha256').update(`${phone}.${code}.${exp}.${secret}`).digest('hex');
  const payload = `${phone}.${exp}.${codeHash}`;
  const outerSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${phone}.${exp}.${codeHash}.${outerSig}`).toString('base64url');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { phone } = req.body || {};
  if (!phone || typeof phone !== 'string') {
    res.status(400).json({ error: 'Phone number is required.' });
    return;
  }

  const normalizedPhone = toE164(phone);
  if (!normalizedPhone) {
    res.status(400).json({ error: 'Enter a valid US phone number, e.g. +1 555 010 1234.' });
    return;
  }

  const { OTP_SECRET, TEXTBELT_KEY } = process.env;
  if (!OTP_SECRET) {
    res.status(500).json({ error: 'Server is missing required environment variables.' });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const exp = Date.now() + CODE_TTL_SECONDS * 1000;

  try {
    // 'textbelt' is a shared, no-signup key good for 1 free text per day
    // per phone number. Set TEXTBELT_KEY as an env var later if you buy
    // your own key for more volume — no code changes needed.
    const resp = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizedPhone,
        message: `Your verification code is ${code}. It expires in 5 minutes.`,
        key: TEXTBELT_KEY || 'textbelt'
      })
    });
    const data = await resp.json();
    if (!data.success) {
      throw new Error(data.error || 'Textbelt could not send the message.');
    }
  } catch (err) {
    res.status(502).json({ error: 'Could not send the text: ' + (err.message || 'unknown error') });
    return;
  }

  res.status(200).json({
    token: buildToken(normalizedPhone, code, exp, OTP_SECRET),
    phone: normalizedPhone
  });
};
