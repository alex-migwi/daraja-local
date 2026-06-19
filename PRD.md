# Daraja Local — Architecture Decision Records (ADR)

# Purpose

This document captures all major architectural decisions for Daraja Local.

The goal is to:

* provide clarity to contributors
* prevent architectural drift
* improve AI-assisted development accuracy
* document why decisions were made
* reduce repeated technical discussions

---

# ADR-001 — Monolithic Modular Architecture

## Status

Accepted

## Context

Daraja Local is expected to:

* start as a local developer tool
* evolve into a hosted SaaS platform
* support multiple payment APIs
* support dashboards and SDKs

The system must remain simple enough for rapid iteration while allowing future expansion.

## Decision

Use a **modular monolith** architecture.

Each business capability exists as an isolated module:

```txt
src/
├── modules/
│   ├── oauth/
│   ├── stk/
│   ├── callbacks/
│   ├── transactions/
│   ├── scenarios/
│   ├── c2b/
│   ├── b2c/
│   └── reversals/
```

Modules communicate internally through interfaces and events.

## Consequences

### Positive

* simpler deployment
* easier local development
* easier AI-assisted implementation
* avoids premature microservices

### Negative

* scaling boundaries are logical rather than physical
* future extraction may be required

## Alternatives Considered

### Microservices

Rejected because:

* excessive complexity
* difficult local setup
* slower development

### Single Layer Application

Rejected because:

* poor maintainability
* difficult future expansion

---

# ADR-002 — Backend Framework

## Status

Accepted

## Context

The backend requires:

* high performance
* TypeScript support
* schema validation
* plugin architecture
* testing friendliness

## Decision

Use Fastify.

## Consequences

### Positive

* fast startup
* low overhead
* strong TypeScript support
* schema-first approach

### Negative

* smaller ecosystem than Express

## Alternatives Considered

### Express

Rejected because:

* fewer built-in validation capabilities

### NestJS

Rejected because:

* additional abstraction not needed
* increased complexity for emulator use case

---

# ADR-003 — Language

## Status

Accepted

## Decision

Use TypeScript exclusively.

## Consequences

### Positive

* shared types
* improved AI code generation
* safer refactoring

### Negative

* build step required

## Alternatives Considered

### JavaScript

Rejected due to weaker maintainability.

---

# ADR-004 — API Contract First Development

## Status

Accepted

## Context

The emulator must closely mimic Daraja APIs.

## Decision

All API development must begin with OpenAPI specification updates.

Implementation follows contract definition.

## Rules

Changes must occur in this order:

```txt
OpenAPI
→ Types
→ Implementation
→ Tests
→ Documentation
```

## Consequences

### Positive

* prevents contract drift
* improves SDK generation

### Negative

* slightly slower initial development

---

# ADR-005 — State Machine Driven Transactions

## Status

Accepted

## Context

Payment systems are inherently stateful.

Without explicit state transitions:

* bugs emerge
* invalid transitions occur
* reconciliation becomes difficult

## Decision

All transaction transitions must occur through a dedicated state machine.

## Valid States

```txt
PENDING
SUCCESS
FAILED
TIMEOUT
CANCELLED
REVERSED
```

## Example

Valid:

```txt
PENDING → SUCCESS
```

Invalid:

```txt
FAILED → SUCCESS
```

## Consequences

### Positive

* deterministic behavior
* easier testing

### Negative

* additional implementation effort

---

# ADR-006 — Event Driven Internal Communication

## Status

Accepted

## Context

Modules must remain loosely coupled.

## Decision

Internal events will be used.

Example:

```txt
STK_CREATED
STK_APPROVED
STK_FAILED
CALLBACK_SENT
CALLBACK_FAILED
```

## Consequences

### Positive

* extensibility
* observability

### Negative

* increased tracing complexity

---

# ADR-007 — Storage Abstraction Layer

## Status

Accepted

## Context

The project requires:

* in-memory development mode
* SQLite mode
* PostgreSQL mode

## Decision

Use repository interfaces.

Example:

```ts
interface TransactionRepository {
  create()
  update()
  findById()
}
```

Implementations:

```txt
MemoryRepository
SQLiteRepository
PostgresRepository
```

## Consequences

### Positive

* storage independence

### Negative

* more code initially

---

# ADR-008 — SQLite as Default Persistent Storage

## Status

Accepted

## Context

Most developers want a simple local setup.

## Decision

SQLite becomes the default persistent store.

## Consequences

### Positive

* no external dependencies
* simple Docker setup

### Negative

* limited scalability

---

# ADR-009 — PostgreSQL for Team and Hosted Modes

## Status

Accepted

## Decision

PostgreSQL becomes the preferred production database.

## Reasoning

Required for:

* hosted environments
* team workspaces
* large transaction volumes

---

# ADR-010 — Redis for Queues Only

## Status

Accepted

## Context

Callbacks require:

* retries
* delayed execution
* failure simulation

## Decision

Redis is used only for queue management.

Not for:

* primary persistence
* transaction storage

## Queue Engine

```txt
BullMQ
```

---

# ADR-011 — Callback Delivery Reliability

## Status

Accepted

## Context

Webhook delivery is inherently unreliable.

## Decision

Implement retry support.

Default strategy:

```txt
1s
5s
15s
30s
```

Maximum attempts:

```txt
5
```

## Consequences

### Positive

* realistic simulation

### Negative

* increased complexity

---

# ADR-012 — Docker First Distribution

## Status

Accepted

## Context

Developers should not need to install dependencies manually.

## Decision

Docker becomes the primary installation mechanism.

Example:

```bash
docker run -p 8080:8080 daraja-local
```

## Consequences

### Positive

* predictable environments

### Negative

* Docker knowledge required

---

# ADR-013 — Web Dashboard Technology

## Status

Accepted

## Decision

Dashboard will be developed separately from the API.

Recommended:

```txt
Angular
```

Alternative:

```txt
React
```

Reason:

* clear separation of concerns
* independent deployments

---

# ADR-014 — Real-Time Updates via WebSockets

## Status

Accepted

## Context

Transaction state changes must be visible immediately.

## Decision

Use WebSockets.

Events:

```txt
transaction.created
transaction.updated
callback.sent
callback.failed
```

## Consequences

### Positive

* responsive UI

### Negative

* connection management required

---

# ADR-015 — Scenario Engine as First-Class Component

## Status

Accepted

## Context

The emulator's primary value is deterministic testing.

## Decision

Scenario simulation is a core subsystem.

Supported outcomes:

```txt
SUCCESS
FAILED
TIMEOUT
DELAYED
DUPLICATE_CALLBACK
CALLBACK_FAILURE
```

## Consequences

### Positive

* powerful testing workflows

### Negative

* larger implementation scope

---

# ADR-016 — No External Safaricom Calls

## Status

Accepted

## Context

The emulator must function offline.

## Decision

The system must never call real Safaricom APIs.

Exceptions:

None.

## Consequences

### Positive

* deterministic behavior
* offline support

### Negative

* cannot validate against real network behavior

---

# ADR-017 — Testing Strategy

## Status

Accepted

## Decision

Every feature must include:

### Unit Tests

Validate:

* state transitions
* payload generation
* validation logic

### Integration Tests

Validate:

* endpoint behavior
* repository interaction
* callback delivery

### E2E Tests

Validate:

* full STK lifecycle

## Coverage Goal

```txt
Minimum: 80%
Target: 90%
```

---

# ADR-018 — AI-Assisted Development Rules

## Status

Accepted

## Context

A significant portion of implementation will be AI-assisted.

## Decision

AI-generated code must follow:

### Rule 1

No API contract modifications without OpenAPI updates.

### Rule 2

No schema changes without migration definitions.

### Rule 3

No business logic outside modules.

### Rule 4

All new endpoints require tests.

### Rule 5

All state transitions must use the state machine.

### Rule 6

No direct database access from route handlers.

### Rule 7

No external dependencies without ADR review.

## Consequences

### Positive

* consistent architecture
* predictable AI output

### Negative

* additional review process

---

# ADR-019 — Future Plugin System

## Status

Proposed

## Context

Future support may include:

* Airtel Money
* MTN Mobile Money
* Stripe
* PayPal
* Flutterwave

## Proposal

Introduce provider plugins.

Example:

```txt
providers/
├── daraja/
├── airtel-money/
├── stripe/
└── flutterwave/
```

Not implemented in v1.

---

# ADR-020 — Product Positioning

## Status

Accepted

## Decision

Daraja Local is positioned as:

```txt
LocalStack for M-Pesa Daraja APIs
```

Primary value:

* local development
* deterministic testing
* callback simulation
* fintech developer productivity

Not:

* payment processor
* gateway
* wallet
* banking platform

```
```
