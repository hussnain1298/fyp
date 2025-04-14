
import { google } from "googleapis";

const auth = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
auth.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const gmail = google.gmail({ version: "v1", auth });

async function sendEmail(to, subject, message) {
  try {
    const rawMessage = Buffer.from(
      `From: me\nTo: ${to}\nSubject: ${subject}\n\n${message}`
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""); // Required Gmail API format

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: rawMessage },
    });

    console.log(`✅ Email sent to ${to}:`, response.data);
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.data || error);
  }
}

// ✅ Test Function Call
sendEmail("receiver@gmail.com", "Chat Message", "Hello! How are you?");
