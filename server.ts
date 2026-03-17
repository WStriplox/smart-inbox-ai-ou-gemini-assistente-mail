import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import path from "path";

const app = express();
const PORT = 3000;

app.use(cookieParser());
app.use(express.json());

// OAuth configuration
const getOAuth2Client = (req: express.Request) => {
  const redirectUri = `${process.env.APP_URL}/auth/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

// API Routes
app.get("/api/auth/url", (req, res) => {
  const oauth2Client = getOAuth2Client(req);
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
  res.json({ url });
});

app.get("/auth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") {
    res.status(400).send("Invalid code");
    return;
  }

  try {
    const oauth2Client = getOAuth2Client(req);
    const { tokens } = await oauth2Client.getToken(code);
    
    res.cookie("google_tokens", JSON.stringify(tokens), {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    res.status(500).send("Authentication failed");
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("google_tokens", {
    secure: true,
    sameSite: "none",
    httpOnly: true,
  });
  res.json({ success: true });
});

app.get("/api/auth/status", (req, res) => {
  const tokensCookie = req.cookies.google_tokens;
  res.json({ isAuthenticated: !!tokensCookie });
});

app.get("/api/emails", async (req, res) => {
  const tokensCookie = req.cookies.google_tokens;
  if (!tokensCookie) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const tokens = JSON.parse(tokensCookie);
    const oauth2Client = getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    // Fetch last 15 emails
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 15,
      q: "in:inbox",
    });

    const messages = response.data.messages || [];
    
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.id) return null;
        const msgDetails = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "full",
        });
        
        const headers = msgDetails.data.payload?.headers || [];
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
        const date = headers.find((h) => h.name === "Date")?.value || "";
        
        let body = "";
        if (msgDetails.data.payload?.parts) {
          const textPart = msgDetails.data.payload.parts.find((p) => p.mimeType === "text/plain");
          if (textPart && textPart.body?.data) {
            body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          } else {
             const htmlPart = msgDetails.data.payload.parts.find((p) => p.mimeType === "text/html");
             if (htmlPart && htmlPart.body?.data) {
                body = Buffer.from(htmlPart.body.data, "base64").toString("utf-8").replace(/<[^>]*>?/gm, '');
             }
          }
        } else if (msgDetails.data.payload?.body?.data) {
          body = Buffer.from(msgDetails.data.payload.body.data, "base64").toString("utf-8");
        }

        return {
          id: msg.id,
          subject,
          from,
          date,
          snippet: msgDetails.data.snippet,
          body: body.substring(0, 2000), // Limit body size for Gemini
        };
      })
    );

    res.json({ emails: emailDetails.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

app.get("/api/emails/weekly", async (req, res) => {
  const tokensCookie = req.cookies.google_tokens;
  if (!tokensCookie) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const tokens = JSON.parse(tokensCookie);
    const oauth2Client = getOAuth2Client(req);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    // Fetch last 40 emails from the last 7 days
    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 40,
      q: "newer_than:7d in:inbox",
    });

    const messages = response.data.messages || [];
    
    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.id) return null;
        const msgDetails = await gmail.users.messages.get({
          userId: "me",
          id: msg.id,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"]
        });
        
        const headers = msgDetails.data.payload?.headers || [];
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        return {
          id: msg.id,
          subject,
          from,
          date,
          snippet: msgDetails.data.snippet,
        };
      })
    );

    res.json({ emails: emailDetails.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching weekly emails:", error);
    res.status(500).json({ error: "Failed to fetch weekly emails" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
