import { Router, Request, Response } from "express";
import { reconnectComponent, ReconnectTarget } from "../bridge";

const router = Router();

const ALLOWED: ReadonlyArray<ReconnectTarget> = ["prusalink", "obico", "camera"];

router.post("/reconnect", async (req: Request, res: Response) => {
  const component = (req.body as { component?: string })?.component;
  if (!component || !ALLOWED.includes(component as ReconnectTarget)) {
    res.status(400).json({
      message: "component must be prusalink, obico, or camera",
    });
    return;
  }
  try {
    await reconnectComponent(component as ReconnectTarget);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reconnect failed";
    res.status(500).json({ message });
  }
});

export default router;
