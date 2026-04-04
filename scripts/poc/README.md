# POC Scripts

Proof-of-concept scripts for manually validating protocol findings against real services.
Run these when Obico API changes or before implementing a new module.

## Available POCs

| Script             | Purpose                                                     | Run                 |
| ------------------ | ----------------------------------------------------------- | ------------------- |
| `obico-connect.ts` | Validates Obico agent protocol (pairing, WebSocket, status) | `npm run poc:obico` |

## Usage

Each POC requires environment variables. See the script header for details.

```bash
cd scripts/poc
npm install
OBICO_URL=http://192.168.1.x:3334 npm run obico
```
