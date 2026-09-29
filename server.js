const express = require("express");

const app = express();
const PORT = process.env.PORT || 10000;

// Health check
app.get("/", (req, res) => {
  res.send("Paddle webhook server is running");
});

// Paddle webhook endpoint
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    console.log("Paddle webhook received");

    console.log("Headers:", req.headers);

    console.log("Body:", req.body.toString());

    // We will add Paddle signature verification next.
    res.status(200).send("OK");
  }
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
