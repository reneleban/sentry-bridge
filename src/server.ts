import express from "express";
import path from "path";

export const app = express();

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("*", (_req, res) => {
  const indexPath = path.join(publicDir, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).json({ error: "Not found" });
  });
});
