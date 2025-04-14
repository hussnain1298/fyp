import { google } from "googleapis";

const auth = new google.auth.OAuth2(
    "294426154189-mvsvvpkftflkh3seeno753c1lhmse89k.apps.googleusercontent.com",
    "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",
    "https://developers.google.com/oauthplayground"
  );
  auth.setCredentials({ refresh_token: "ya29.a0AeXRPp5FTomHqNtGiCAdy62cx_RDM-npxeIQOY48AsY50cz3TlynOZd4AHs878EsAfn5RH_VxJ5eyiWdy0kaPiF2_AWzEnhIwW3rHGdPka_yzO0aXidDyTtY3BK_E5xqKRobO54_egIuXoLZuqnXjH5UN1a3Z3zWWDoVnuPvaCgYKAegSARASFQHGX2MiVZJ75OoWup2ijWPiWMjSyA0175" });
  

async function testAuth() {
  try {
    const gmail = google.gmail({ version: "v1", auth });
    const profile = await gmail.users.getProfile({ userId: "me" });
    console.log("✅ Authentication Successful: ", profile.data);
  } catch (error) {
    console.error("❌ Authentication Failed: ", error.message);
  }
}

testAuth();
