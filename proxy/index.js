/* eslint-disable @typescript-eslint/no-require-imports */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3001;

// 보안
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

// Rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 60, // 분당 60회
  })
);

// API 키 검증 미들웨어
function validateApiKey(req, res, next) {
  const apiKey = req.headers["x-proxy-key"];
  if (apiKey !== process.env.PROXY_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// 키움 API 프록시
const KIWOOM_BASE =
  process.env.KIWOOM_BASE_URL || "https://api.kiwoom.com";

app.all("/kiwoom/*", validateApiKey, async (req, res) => {
  const path = req.path.replace("/kiwoom", "");
  const queryString = req.url.includes("?")
    ? req.url.substring(req.url.indexOf("?"))
    : "";
  const url = `${KIWOOM_BASE}${path}${queryString}`;

  try {
    const headers = {
      "Content-Type": "application/json",
    };

    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization;
    }
    if (req.headers["appkey"]) {
      headers["appkey"] = req.headers["appkey"];
    }
    if (req.headers["appsecret"]) {
      headers["appsecret"] = req.headers["appsecret"];
    }
    if (req.headers["api-id"]) {
      headers["api-id"] = req.headers["api-id"];
    }
    if (req.headers["cont-yn"]) {
      headers["cont-yn"] = req.headers["cont-yn"];
    }
    if (req.headers["next-key"]) {
      headers["next-key"] = req.headers["next-key"];
    }

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Proxy error:", error.message);
    res.status(502).json({
      error: "프록시 서버 오류",
      message: error.message,
    });
  }
});

// 헬스체크
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Kiwoom proxy running on port ${PORT}`);
});
