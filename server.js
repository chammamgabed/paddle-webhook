const express = require("express");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 10000;
const WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;
const CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN;

const PRICE_ID = "pri_01m3hq83szwpw1aqj47ms9jma9";

// ===============================
// Paddle Webhook
// ===============================
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

      const parts = signature.split(";");

      const timestampPart = parts.find((p) => p.startsWith("ts="));
      const signaturePart = parts.find((p) => p.startsWith("h1="));

      if (!timestampPart || !signaturePart) {
        return res.status(400).send("Invalid Paddle-Signature");
      }

      const timestamp = timestampPart.substring(3);
      const receivedSignature = signaturePart.substring(3);

      const signedPayload =
        timestamp + ":" + req.body.toString("utf8");

      const expectedSignature = crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(signedPayload)
        .digest("hex");

      const receivedBuffer = Buffer.from(receivedSignature, "utf8");
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");

      if (
        receivedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
      ) {
        console.log("Invalid Paddle webhook signature");
        return res.status(400).send("Invalid signature");
      }

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

// ===============================
// صفحة الشراء
// ===============================
app.get("/", (req, res) => {
  if (!CLIENT_TOKEN) {
    return res.status(500).send("Paddle client token is not configured");
  }

  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>The Digital Success System</title>

  <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f5f5f5;
      margin: 0;
      padding: 40px 20px;
      text-align: center;
    }

    .product {
      max-width: 500px;
      margin: auto;
      background: white;
      padding: 35px;
      border-radius: 16px;
      box-shadow: 0 5px 25px rgba(0,0,0,0.08);
    }

    h1 {
      margin-bottom: 15px;
    }

    .price {
      font-size: 32px;
      font-weight: bold;
      margin: 25px 0;
    }

    button {
      background: #111;
      color: white;
      border: none;
      padding: 15px 35px;
      font-size: 18px;
      border-radius: 8px;
      cursor: pointer;
    }

    button:hover {
      opacity: 0.85;
    }
  </style>
</head>

<body>

  <div class="product">

    <h1>The Digital Success System</h1>

    <p>Get instant access to the Digital Success System.</p>

    <div class="price">$15</div>

    <button onclick="openCheckout()">
      Buy Now
    </button>

  </div>

  <script>
    Paddle.Environment.set("sandbox");

    Paddle.Initialize({
      token: ${JSON.stringify(CLIENT_TOKEN)}
    });

    function openCheckout() {
      Paddle.Checkout.open({
        items: [
          {
            priceId: "${PRICE_ID}",
            quantity: 1
          }
        ]
      });
    }
  </script>

</body>
</html>
  `);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
