# Troubleshooting

## `daraja-local` Is Not Recognized

Rebuild and relink:

```bash
npm run build
npm link
```

Then verify:

```bash
daraja-local --version
```

If it still fails, check npm's global prefix:

```bash
npm prefix -g
```

Make sure that folder is in your `PATH`.

On this machine, npm reports:

```txt
C:\nvm4w\nodejs
```

## Direct Built CLI Works But Global Command Does Not

Try:

```bash
node dist/src/cli/index.js --version
```

If this works, the project built correctly and the problem is the global link or `PATH`.

If this fails, rebuild:

```bash
npm run build
```

## `dist/src/cli/index.js` Is Missing

Run:

```bash
npm run build
```

The `package.json` binary points to:

```txt
dist/src/cli/index.js
```

## Port 8080 Is Already In Use

Use another port:

```bash
daraja-local start --port 9090
```

Then point CLI commands at it:

```bash
daraja-local transactions --base-url http://127.0.0.1:9090
```

## Callback Is Not Received

Check:

- the `CallBackURL` in your STK Push request is reachable from your machine
- your app accepts `POST`
- your app accepts `Content-Type: application/json`
- no firewall or port conflict is blocking the callback server

Inspect the transaction:

```bash
daraja-local transactions
```

Look at `callbackAttempts` for status code or error details.

## Transaction Cannot Be Approved After Failing

This is expected. Daraja Local enforces state transitions.

Create a new STK Push request if you need to test another outcome.
