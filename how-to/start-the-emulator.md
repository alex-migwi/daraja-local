# Start the Local Emulator

## Flow

```txt
1. Install dependencies.

2. Start Daraja Local with npm or the linked CLI.

3. Daraja Local opens a Fastify server on the configured host and port.

4. Your app sends Daraja-style requests to the local URL.

5. Simulator commands call the same local server to approve, fail, timeout, or inspect transactions.
```

## Start in Development Mode

```bash
npm run dev
```

This runs the TypeScript CLI through `tsx`.

## Start the Built CLI

```bash
npm run build
npm start
```

## Start Through the Linked Command

After `npm link`:

```bash
daraja-local start
```

## Custom Host and Port

```bash
daraja-local start --host 127.0.0.1 --port 8080
```

Environment variables also work:

```bash
set DARAJA_LOCAL_HOST=127.0.0.1
set DARAJA_LOCAL_PORT=8080
daraja-local start
```

PowerShell:

```powershell
$env:DARAJA_LOCAL_HOST = "127.0.0.1"
$env:DARAJA_LOCAL_PORT = "8080"
daraja-local start
```

## Check Health

```bash
curl http://127.0.0.1:8080/health
```

Expected response:

```json
{
  "status": "ok"
}
```

## Check Version

```bash
curl http://127.0.0.1:8080/version
```

Expected response:

```json
{
  "name": "daraja-local",
  "version": "0.1.0"
}
```
