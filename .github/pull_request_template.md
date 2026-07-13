## Summary

<!-- Describe the focused change and its user-visible effect. -->

## Why

<!-- Explain the problem being solved. Link the related issue with "Closes #..." when applicable. -->

## Daraja compatibility

<!-- Link official Safaricom documentation when public API behavior changes. State "Not applicable" for internal-only changes. -->

- Contract impact:
- Deliberate emulator differences:

## Verification

<!-- List the commands and manual checks that passed. -->

```text
npm run check
npm test
npm run test:coverage
npm run build
```

## Checklist

- [ ] The change is limited to one clear concern.
- [ ] Tests cover new or changed behavior.
- [ ] Lint, type checking, tests, coverage thresholds, and build pass.
- [ ] Public Daraja fields, casing, routes, and response shapes follow official documentation.
- [ ] Compatibility documentation is updated when behavior or support changes.
- [ ] No generated artifacts, credentials, or unrelated files are included.
- [ ] The contribution follows the Code of Conduct.
