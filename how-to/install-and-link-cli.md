# Install and Link the CLI

Use this guide when developing Daraja Local from this local folder.

## 1. Install Dependencies

From the project root:

```bash
npm install
```

## 2. Build the CLI

The linked CLI runs the compiled JavaScript in `dist`, so build before linking:

```bash
npm run build
```

## 3. Link Globally

```bash
npm link
```

This should make the `daraja-local` command available in your terminal.

## 4. Verify the Link

```bash
daraja-local --version
```

Expected output:

```txt
1.0.0
```

## 5. If `daraja-local` Is Not Found

First confirm npm knows the package is linked:

```bash
npm list -g --depth=0
```

Example output:

```txt
daraja-local@1.0.0 -> C:\user\daraja-local
```

Then confirm your npm global prefix:

```bash
npm prefix -g
```

Example output:

```txt
C:\nvm4w\nodejs
```

Make sure that folder is in your `PATH`. In PowerShell:

```powershell
$env:Path -split ';' | Select-String -SimpleMatch 'C:\nvm4w\nodejs'
```

If the path is present but the command is still missing, rebuild and relink:

```bash
npm run build
npm link
```

## 6. Run Without Global Link

You can always run the CLI directly through npm:

```bash
npm run dev
```

Or after building:

```bash
npm start
```

For one-off commands against the built CLI:

```bash
node dist/src/cli/index.js --version
node dist/src/cli/index.js transactions
```

## 7. Unlink

```bash
npm unlink -g daraja-local
```
