const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;

// Health check
app.get("/", (req, res) => {
  res.send("Paddle webhook server is running");
});

// Paddle webhook
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const signatureHeader = req.headers["paddle-signature"];
      const secret = process.env.PADDLE_WEBHOOK_SECRET;

      if (!signatureHeader) {
        return res.status(400).send("Missing Paddle-Signature");
      }

      if (!secret) {
        console.error("PADDLE_WEBHOOK_SECRET is not configured");
        return res.status(500).send("Webhook secret not configured");
      }

      // Extract timestamp and signature
      const parts = signatureHeader.split(";");

      const timestampPart = parts.find((part) => part.startsWith("ts="));
      const signaturePart = parts.find((part) => part.startsWith("h1="));

      if (!timestampPart || !signaturePart) {
        return res.status(400).send("Invalid Paddle-Signature");
      }

      const timestamp = timestampPart.substring(3);
      const receivedSignature = signaturePart.substring(3);

      // Check timestamp
      const timestampNumber = Number(timestamp);
      const currentTime = Math.floor(Date.now() / 1000);

      if (
        !Number.isFinite(timestampNumber) ||
        Math.abs(currentTime - timestampNumber) > 5
      ) {
        return res.status(408).send("Webhook timestamp expired");
      }

      // Keep the raw request body exactly as received
      const rawBody = req.body.toString();

      // Paddle signs: timestamp + ":" + raw body
      const signedPayload = `${timestamp}:${rawBody}`;

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(signedPayload)
        .digest("hex");

      // Secure comparison
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const receivedBuffer = Buffer.from(receivedSignature, "utf8");

      if (
        expectedBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
      ) {
        console.error("Invalid Paddle webhook signature");
        return res.status(401).send("Invalid signature");
      }

      // Signature is valid
      const event = JSON.parse(rawBody);

      console.log("Verified Paddle webhook:");
      console.log("Event type:", event.event_type);
      console.log("Event ID:", event.event_id);

      if (event.event_type === "transaction.completed") {
        console.log("Payment completed successfully.");
      }

      return res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook processing error:", error);
      return res.status(500).send("Webhook processing failed");
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
