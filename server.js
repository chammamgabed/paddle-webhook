const express = require("express");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;
const WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

// Paddle webhook يحتاج الـ raw body للتحقق من التوقيع
app.post(
  "/webhooks",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const signature = req.headers["paddle-signature"];

      if (!signature) {
        return res.status(400).send("Missing Paddle-Signature");
      }

      if (!WEBHOOK_SECRET) {
        console.error("PADDLE_WEBHOOK_SECRET is not configured");
        return res.status(500).send("Webhook secret not configured");
      }

      // استخراج timestamp والتوقيع من Paddle-Signature
      const parts = signature.split(";");
      const timestampPart = parts.find((p) => p.startsWith("ts="));
      const signaturePart = parts.find((p) => p.startsWith("h1="));

      if (!timestampPart || !signaturePart) {
        return res.status(400).send("Invalid Paddle-Signature");
      }

      const timestamp = timestampPart.substring(3);
      const receivedSignature = signaturePart.substring(3);

      // إنشاء النص الذي وقّعته Paddle
      const signedPayload =
        timestamp + ":" + req.body.toString("utf8");

      const expectedSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(signedPayload)
        .digest("hex");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.log("Invalid Paddle webhook signature");
        return res.status(400).send("Invalid signature");
      }

      // التوقيع صحيح
      const event = JSON.parse(req.body.toString("utf8"));

      console.log("Paddle webhook received:");
      console.log("Event type:", event.event_type);
      console.log("Event ID:", event.event_id);

      return res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      return res.status(400).send("Invalid webhook");
    }
  }
);

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send("Paddle Webhook is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
