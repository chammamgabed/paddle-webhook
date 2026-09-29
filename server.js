const express = require("express");
const crypto = require("crypto");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// LIVE Paddle API
const PADDLE_API_URL = "https://api.paddle.com";

// =========================
// Health check
// =========================

app.get("/", (req, res) => {
  res.send("Paddle webhook server is running");
});

// =========================
// CORS
// =========================

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://chammamgabed.github.io"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// =========================
// Verify transaction
// =========================

app.get("/verify", async (req, res) => {
  try {
    const transactionId = req.query.transaction_id;
    const apiKey = process.env.PADDLE_API_KEY;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Missing transaction_id"
      });
    }

    if (!apiKey) {
      console.error("PADDLE_API_KEY is not configured");

      return res.status(500).json({
        success: false,
        message: "API key not configured"
      });
    }

    const response = await fetch(
      `${PADDLE_API_URL}/transactions/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Paddle API error:", result);

      return res.status(400).json({
        success: false,
        message: "Transaction could not be verified"
      });
    }

    const transaction = result.data;

    console.log("=================================");
    console.log("Transaction verification request");
    console.log("Transaction ID:", transaction.id);
    console.log("Status:", transaction.status);
    console.log("Custom data:", transaction.custom_data);

    const customData = transaction.custom_data;

    const validPurchase =
      transaction.status === "completed" &&
      customData &&
      customData.course === "digital-success-course";

    if (validPurchase) {
      console.log("Digital Success Course access approved.");

      return res.json({
        success: true,
        access: true
      });
    }

    console.log("Access denied.");

    return res.json({
      success: true,
      access: false
    });

  } catch (error) {
    console.error("Verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Verification failed"
    });
  }
});

// =========================
// Protected course
// =========================

app.get("/course", async (req, res) => {
  try {
    const transactionId = req.query.transaction_id;
    const apiKey = process.env.PADDLE_API_KEY;

    if (!transactionId) {
      return res.status(403).send("Access denied.");
    }

    if (!apiKey) {
      console.error("PADDLE_API_KEY is not configured");

      return res.status(500).send(
        "Server configuration error."
      );
    }

    const response = await fetch(
      `${PADDLE_API_URL}/transactions/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Paddle API error:", result);

      return res.status(403).send(
        "Payment verification failed."
      );
    }

    const transaction = result.data;
    const customData = transaction.custom_data;

    const validPurchase =
      transaction.status === "completed" &&
      customData &&
      customData.course === "digital-success-course";

    if (!validPurchase) {
      console.log(
        "Protected course access denied."
      );

      return res.status(403).send(
        "Access denied."
      );
    }

    const coursePath =
      "/etc/secrets/course-content.html";

    if (!fs.existsSync(coursePath)) {
      console.error(
        "Course content file is missing."
      );

      return res.status(500).send(
        "Course content is not configured."
      );
    }

    const courseHtml =
      fs.readFileSync(
        coursePath,
        "utf8"
      );

    console.log(
      "Protected course access approved for:",
      transaction.id
    );

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.setHeader(
      "Pragma",
      "no-cache"
    );

    res.setHeader(
      "Expires",
      "0"
    );

    return res.send(courseHtml);

  } catch (error) {
    console.error(
      "Protected course error:",
      error
    );

    return res.status(500).send(
      "Unable to open the course."
    );
  }
});

// =========================
// Paddle webhook
// =========================

app.post(
  "/webhook",
  express.raw({
    type: "application/json"
  }),
  (req, res) => {
    try {
      const signatureHeader =
        req.headers["paddle-signature"];

      const secret =
        process.env.PADDLE_WEBHOOK_SECRET;

      if (!signatureHeader) {
        return res
          .status(400)
          .send(
            "Missing Paddle-Signature"
          );
      }

      if (!secret) {
        console.error(
          "PADDLE_WEBHOOK_SECRET is not configured"
        );

        return res
          .status(500)
          .send(
            "Webhook secret not configured"
          );
      }

      const parts =
        signatureHeader.split(";");

      const timestampPart =
        parts.find((part) =>
          part.startsWith("ts=")
        );

      const signaturePart =
        parts.find((part) =>
          part.startsWith("h1=")
        );

      if (
        !timestampPart ||
        !signaturePart
      ) {
        return res
          .status(400)
          .send(
            "Invalid Paddle-Signature"
          );
      }

      const timestamp =
        timestampPart.substring(3);

      const receivedSignature =
        signaturePart.substring(3);

      const timestampNumber =
        Number(timestamp);

      const currentTime =
        Math.floor(
          Date.now() / 1000
        );

      if (
        !Number.isFinite(
          timestampNumber
        ) ||
        Math.abs(
          currentTime -
          timestampNumber
        ) > 5
      ) {
        return res
          .status(408)
          .send(
            "Webhook timestamp expired"
          );
      }

      const rawBody =
        req.body.toString();

      const signedPayload =
        `${timestamp}:${rawBody}`;

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            secret
          )
          .update(
            signedPayload
          )
          .digest("hex");

      const expectedBuffer =
        Buffer.from(
          expectedSignature,
          "utf8"
        );

      const receivedBuffer =
        Buffer.from(
          receivedSignature,
          "utf8"
        );

      if (
        expectedBuffer.length !==
          receivedBuffer.length ||
        !crypto.timingSafeEqual(
          expectedBuffer,
          receivedBuffer
        )
      ) {
        console.error(
          "Invalid Paddle webhook signature"
        );

        return res
          .status(401)
          .send(
            "Invalid signature"
          );
      }

      const event =
        JSON.parse(rawBody);

      console.log(
        "================================="
      );

      console.log(
        "Verified Paddle webhook"
      );

      console.log(
        "Event type:",
        event.event_type
      );

      console.log(
        "Event ID:",
        event.event_id
      );

      if (
        event.event_type ===
        "transaction.completed"
      ) {
        const transaction =
          event.data;

        console.log(
          "Payment completed successfully."
        );

        console.log(
          "Transaction ID:",
          transaction.id
        );

        const customData =
          transaction.custom_data;

        console.log(
          "Custom data:",
          customData
        );

        if (
          customData &&
          customData.course ===
            "digital-success-course"
        ) {
          console.log(
            "Digital Success Course purchase confirmed."
          );
        } else {
          console.log(
            "No Digital Success Course custom data found."
          );
        }
      }

      console.log(
        "================================="
      );

      return res
        .status(200)
        .send("OK");

    } catch (error) {
      console.error(
        "Webhook processing error:",
        error
      );

      return res
        .status(500)
        .send(
          "Webhook processing failed"
        );
    }
  }
);

// =========================
// Start server
// =========================

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);
