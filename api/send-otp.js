/* CHATGPT CHANGES */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    const { phone, userid } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required"
      });
    }

    /*
     * Textbelt requires a userid so it knows which
     * OTP belongs to which user.
     *
     * If the frontend doesn't provide one, we'll
     * temporarily use the phone number.
     */
    const otpUserId = userid || phone;

    const params = new URLSearchParams();

    params.append("phone", phone);
    params.append("userid", otpUserId);
    params.append("key", process.env.TEXTBELT_KEY);

    // 6-digit OTP
    params.append("length", "6");

    // OTP expires after 5 minutes
    params.append("lifetime", "300");

    // Textbelt replaces $OTP with the actual code
    params.append(
      "message",
      "Your verification code is $OTP. It expires in 5 minutes."
    );

    const response = await fetch(
      "https://textbelt.com/otp/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
      }
    );

    const data = await response.json();

    if (!data.success) {
      console.error("Textbelt error:", data);

      return res.status(400).json({
        success: false,
        error: data.error || "Failed to send OTP"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Verification code sent",
      textId: data.textId
    });

  } catch (error) {
    console.error("Send OTP error:", error);

    return res.status(500).json({
      success: false,
      error: "Server error while sending OTP"
    });
  }
}

/* CHANGES END */
