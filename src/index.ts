import { app } from "./server";

const port = parseInt(process.env.PORT ?? "3000", 10);

app.listen(port, () => {
  console.log(`obico-prusalink-bridge running on port ${port}`);
});
