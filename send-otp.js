const crypto = require('crypto');
const twilio = require('twilio');

const CODE_TTL_SECONDS = 5 * 60; // 5 minutes

// Twilio requires strict E.164: "+" + country code + digits, no spaces,
// dashes, or parens. Normalize whatever the user typed into that shape.
function toE164(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;          // US, no country code typed
  if (digits.length === 11 && digits[0] === '1') return '+' + digits; // US with leading 1
  if (raw.trim().startsWith('+') && digits.length > 7) return '+' + digits; // already had a +
  return null; // not enough digits to be a real number
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
    res.status(400).json({ error: 'Enter a valid phone number, e.g. +1 555 010 1234.' });
    return;
  }

  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    OTP_SECRET
  } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !OTP_SECRET) {
    res.status(500).json({ error: 'Server is missing required environment variables.' });
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const exp = Date.now() + CODE_TTL_SECONDS * 1000;

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: `Your verification code is ${code}. It expires in 5 minutes.`,
      from: TWILIO_PHONE_NUMBER,
      to: normalizedPhone
    });
  } catch (err) {
    res.status(502).json({ error: 'Could not send the text: ' + (err.message || 'unknown error') });
    return;
  }

  // The token encodes a hash of the code, not the code itself, so nothing
  // secret is exposed to the browser. We also hand back the normalized
  // phone so the client sends the exact same value back on verify.
  res.status(200).json({
    token: buildToken(normalizedPhone, code, exp, OTP_SECRET),
    phone: normalizedPhone
  });
};
