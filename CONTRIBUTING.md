# Contributing to Daraja Local

Thank you for helping improve Daraja Local. Contributions should keep the emulator predictable, focused, and consistent with the supported Safaricom Daraja contracts.

## Before You Start

- Search existing issues and pull requests before opening a new one.
- Use the relevant issue template for bugs, features, or general work.
- Discuss significant API or architectural changes in an issue before implementation.
- Read the [Daraja compatibility contract](./docs/compatibility.md).

The active Safaricom Daraja documentation is authoritative for public API behavior. Community projects may provide context, but they do not define this emulator's contract. B2Pochi and generic M-PESA utility APIs are currently outside the supported scope.

## Development Setup

Requirements:

- Node.js 20 or later
- npm

Install dependencies and run the checks:

```bash
npm ci
npm run check
npm test
npm run test:coverage
npm run build
```

When changing HTTP routes or callbacks, also start the built server and run the live harness:

```bash
npm start
./scripts/test-live.sh
```

## Making Changes

- Keep each change focused on one concern.
- Add or update tests for observable behavior.
- Preserve documented Daraja field names, casing, routes, and response shapes.
- Record deliberate emulator differences in `docs/compatibility.md`.
- Do not add unsupported behavior through generic abstractions.
- Avoid unrelated formatting or refactoring.
- Do not commit `coverage/`, `dist/`, `node_modules/`, secrets, or `.env` files.

## Code Quality

Production TypeScript is subject to these limits:

- Cyclomatic complexity: 10
- Nesting depth: 4
- Parameters per function: 5
- Effective lines per function: 80

Run `npm run check` before submitting. It enforces ESLint and strict TypeScript checking.

## Commits and Pull Requests

- Use small, logical commits with clear imperative messages.
- Complete the pull-request template.
- Explain the user-visible behavior and why the change is needed.
- Link the relevant issue and Daraja documentation when API compatibility is affected.
- Include the commands used to verify the change.
- Keep the pull request free of unrelated files.

A change is ready for review only when lint, type checking, tests, coverage thresholds, and the build pass.

## Security Reports

Do not open a public issue for a vulnerability or exposed credential. Use the repository's private security advisory form instead.

## Conduct

Participation in this project is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md).
