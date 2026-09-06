const crypto = require('crypto');
const nodemailer = require('nodemailer');

const CODE_TTL_SECONDS = 5 * 60; // 5 minutes

// AT&T's email-to-SMS gateway. Change this if you switch carriers later.
const CARRIER_GATEWAY = 'sms.myboostmobile.com';

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

  const { GMAIL_USER, GMAIL_APP_PASSWORD, OTP_SECRET } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !OTP_SECRET) {
    res.status(500).json({ error: 'Server is missing required environment variables.' });
    return;
  }

  const digits = phone.replace(/\D/g, '').slice(-10); // last 10 digits, no +1/formatting
  if (digits.length !== 10) {
    res.status(400).json({ error: 'Enter a 10-digit US phone number.' });
    return;
  }
  const gatewayAddress = `${digits}@${CARRIER_GATEWAY}`;

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const exp = Date.now() + CODE_TTL_SECONDS * 1000;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
    });
    await transporter.sendMail({
      from: GMAIL_USER,
      to: gatewayAddress,
      subject: '', // carrier gateways usually ignore/strip this
      text: `Your verification code is ${code}. It expires in 5 minutes.`
    });
  } catch (err) {
    res.status(502).json({ error: 'Could not send the text: ' + (err.message || 'unknown error') });
    return;
  }

  // The token encodes a hash of the code, not the code itself, so nothing
  // secret is exposed to the browser.
  res.status(200).json({ token: buildToken(phone, code, exp, OTP_SECRET) });
};
