const express = require("express");

const app = express();

const PORT = process.env.PORT || 10000;
const CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN;

// ===============================
// الصفحة الرئيسية
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
      alert("Checkout is not configured yet.");
    }
  </script>

</body>
</html>
  `);
});

// ===============================
// تشغيل الخادم
// ===============================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
