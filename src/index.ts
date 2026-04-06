import "dotenv/config";
import { app } from "./server";
import { startBridge } from "./bridge";

const port = parseInt(process.env.PORT ?? "3000", 10);

app.listen(port, () => {
  console.log(`obico-prusalink-bridge running on port ${port}`);
  startBridge(port).catch((err) =>
    console.error("[bridge] Failed to start:", err)
  );
});
