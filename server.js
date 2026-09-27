const express = require("express");

const app = express();

app.use(express.json());

app.post("/webhooks", (req, res) => {
  console.log("Paddle webhook received");
  console.log(req.body);

  res.status(200).send("OK");
});

app.get("/", (req, res) => {
  res.send("Paddle Webhook is running");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
