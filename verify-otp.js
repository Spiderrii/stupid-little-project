const twilio = require('twilio');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { phone, code } = req.body || {};
  if (!phone || !code) {
    res.status(400).json({ success: false, error: 'Missing phone or code.' });
    return;
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    res.status(500).json({ error: 'Server is missing required environment variables.' });
    return;
  }

  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const check = await client.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phone, code });

    if (check.status === 'approved') {
      res.status(200).json({ success: true });
    } else {
      res.status(200).json({ success: false, error: 'Incorrect code.' });
    }
  } catch (err) {
    // Twilio throws (rather than returning a check result) for cases like
    // an expired/already-used verification — treat those as "incorrect"
    // rather than a server error.
    res.status(200).json({ success: false, error: 'Incorrect or expired code.' });
  }
};
