# Daraja Local — Fully Specified Engineering Task Breakdown

# Engineering Principles

## Mandatory Rules

### Rule 1 — No Hidden Scope

Each task must define:

* exact deliverables
* explicit exclusions
* acceptance criteria

### Rule 2 — Independent Completion

Each task should be completable independently.

### Rule 3 — Testability

Every task must define:

* what is tested
* how it is tested
* expected outcomes

### Rule 4 — No Implicit Features

Only implement explicitly listed behavior.

---

# PHASE 1 — Core Emulator Foundation

# Goal

Deliver a minimal working Daraja emulator supporting:

* OAuth
* STK Push
* STK Query
* manual callback simulation

---

# TASK 1.1 — Repository Initialization

## Objective

Create the foundational monorepo/project structure.

## Deliverables

* TypeScript setup
* ESLint
* Prettier
* Dockerfile
* docker-compose.yml
* environment config loader
* Fastify bootstrap server

## Must Include

```txt
/src
/tests
/docker
/config
```

## Must NOT Include

* dashboard
* database integration
* Redis
* BullMQ

## Acceptance Criteria

* `npm run dev` starts server
* Docker container builds successfully
* lint passes
* typecheck passes

## Tests

* startup test
* health endpoint test

---

# TASK 1.2 — Health & Metadata Endpoints

## Objective

Expose system metadata endpoints.

## Deliverables

```http
GET /health
GET /version
```

## Response Requirements

### /health

```json
{
  "status": "ok"
}
```

### /version

```json
{
  "name": "daraja-local",
  "version": "x.x.x"
}
```

## Must NOT Include

* metrics
* readiness probes

## Acceptance Criteria

Endpoints return valid JSON.

---

# TASK 1.3 — OAuth Emulator

## Objective

Implement Daraja-compatible OAuth token generation.

## Deliverables

```http
GET /oauth/v1/generate
```

## Required Behavior

* accept basic auth
* generate fake access token
* configurable expiry

## Must NOT Include

* JWT signing
* real auth provider integration

## Acceptance Criteria

Applications using Daraja OAuth can authenticate successfully.

## Tests

* valid credentials
* missing credentials
* malformed auth header

---

# TASK 1.4 — In-Memory Transaction Store

## Objective

Implement temporary transaction persistence.

## Deliverables

* transaction repository
* CRUD operations
* transaction state support

## States

```txt
PENDING
SUCCESS
FAILED
TIMEOUT
```

## Must NOT Include

* PostgreSQL
* SQLite
* Redis

## Acceptance Criteria

Transactions persist during runtime.

---

# TASK 1.5 — STK Push Endpoint

## Objective

Implement STK push request handling.

## Deliverables

```http
POST /mpesa/stkpush/v1/processrequest
```

## Required Behavior

* validate payload
* generate IDs
* create transaction
* return Daraja-compatible response

## Must NOT Include

* callback dispatch
* auto-approval
* retries

## Acceptance Criteria

Valid request creates pending transaction.

## Tests

* valid request
* missing required fields
* invalid amount
* malformed JSON

---

# TASK 1.6 — STK Query Endpoint

## Objective

Allow querying transaction status.

## Deliverables

```http
POST /mpesa/stkpushquery/v1/query
```

## Required Behavior

* lookup transaction
* return state

## Must NOT Include

* reconciliation logic

## Acceptance Criteria

Returns accurate transaction state.

---

# TASK 1.7 — Manual Callback Trigger Endpoints

## Objective

Allow simulation of transaction outcomes.

## Deliverables

```http
POST /simulator/stk/:id/approve
POST /simulator/stk/:id/fail
POST /simulator/stk/:id/timeout
```

## Required Behavior

* transition transaction state
* dispatch callback

## Must NOT Include

* retries
* delayed callbacks

## Acceptance Criteria

Callbacks reach configured URL.

## Tests

* approval callback
* timeout callback
* failed callback

---

# TASK 1.8 — Callback Dispatcher

## Objective

Implement outbound webhook delivery.

## Deliverables

* HTTP POST callback sender
* payload formatter

## Required Behavior

* send callback JSON
* configurable timeout

## Must NOT Include

* retry queues
* dead letter queues

## Acceptance Criteria

Callbacks are delivered successfully.

---

# TASK 1.9 — Docker Packaging

## Objective

Package emulator for local execution.

## Deliverables

* production Dockerfile
* docker-compose.yml

## Acceptance Criteria

```bash
docker compose up
```

starts emulator successfully.

---

# PHASE 2 — Dashboard & Developer Experience

# Goal

Improve usability and observability.

---

# TASK 2.1 — Dashboard Skeleton

## Deliverables

* frontend app
* routing
* transaction table

## Must NOT Include

* authentication
* analytics

---

# TASK 2.2 — Real-Time Transaction Updates

## Deliverables

* websocket updates
* live status changes

## Acceptance Criteria

Dashboard updates without refresh.

---

# TASK 2.3 — Transaction Details Panel

## Deliverables

* raw payload viewer
* callback payload viewer

## Must NOT Include

* payload editing

---

# TASK 2.4 — Manual Action Controls

## Deliverables

Buttons:

* approve
* fail
* timeout

## Acceptance Criteria

Actions trigger correct callbacks.

---

# TASK 2.5 — Callback Log Viewer

## Deliverables

* callback history
* response codes
* timestamps

## Must NOT Include

* analytics dashboards

---

# PHASE 3 — Reliability & Failure Simulation

# Goal

Enable realistic fintech testing.

---

# TASK 3.1 — Delayed Callback Engine

## Deliverables

* configurable callback delay

## Acceptance Criteria

Callbacks dispatch after configured delay.

---

# TASK 3.2 — Duplicate Callback Simulation

## Deliverables

* configurable duplicate callback count

## Acceptance Criteria

System can emit duplicate callbacks.

---

# TASK 3.3 — Retry Engine

## Deliverables

* retry queue
* exponential backoff

## Must NOT Include

* Kafka integration

---

# TASK 3.4 — Failed Callback Simulation

## Deliverables

* simulate unreachable callback URLs
* retry exhaustion

---

# TASK 3.5 — Scenario Configuration Files

## Deliverables

YAML/JSON scenario definitions.

## Example

```yaml
result: success
delayMs: 5000
duplicates: 2
```

---

# PHASE 4 — Persistence & Scalability

# Goal

Support long-running environments.

---

# TASK 4.1 — SQLite Persistence

## Deliverables

* SQLite adapter
* migrations

## Must NOT Include

* sharding
* replication

---

# TASK 4.2 — PostgreSQL Persistence

## Deliverables

* PostgreSQL adapter
* schema management

---

# TASK 4.3 — Redis Queue Integration

## Deliverables

* BullMQ integration
* retry queue

---

# PHASE 5 — Additional Daraja APIs

# Goal

Expand API coverage.

---

# TASK 5.1 — C2B Registration

## Deliverables

```http
POST /mpesa/c2b/v1/registerurl
```

---

# TASK 5.2 — C2B Simulation

## Deliverables

```http
POST /mpesa/c2b/v1/simulate
```

---

# TASK 5.3 — B2C Payments

## Deliverables

```http
POST /mpesa/b2c/v1/paymentrequest
```

---

# TASK 5.4 — Reversal API

## Deliverables

```http
POST /mpesa/reversal/v1/request
```

---

# PHASE 6 — CI/CD & SDKs

# Goal

Enable automation and ecosystem integrations.

---

# TASK 6.1 — TypeScript SDK

## Deliverables

* typed client
* helper methods

---

# TASK 6.2 — GitHub Actions Template

## Deliverables

* reusable CI workflow

---

# TASK 6.3 — Docker Test Containers

## Deliverables

* ephemeral test environments

---

# TASK 6.4 — Postman Collection

## Deliverables

* complete request collection

---

# PHASE 7 — Hosted Platform

# Goal

Commercial/team platform.

---

# TASK 7.1 — Multi-Tenant Architecture

## Deliverables

* workspace isolation

---

# TASK 7.2 — Team Accounts

## Deliverables

* organizations
* members
* permissions

---

# TASK 7.3 — Hosted Callback Replay

## Deliverables

* replay history
* webhook inspection

---

# TASK 7.4 — Metrics & Analytics

## Deliverables

* transaction metrics
* callback metrics

## Must NOT Include

* billing system

---

# Definition of Done (Global)

A task is complete only if:

* implementation exists
* tests pass
* lint passes
* typecheck passes
* documentation updated
* Docker build succeeds
* no undefined TODOs remain
