# In-Depth Contributor Guide: StellarEduPay

This guide provides technical depth to help you align with our architecture. Before starting, please ensure you have read the [Tech Stack](#tech-stack) and [How It Works](#how-it-works) sections in the main `README.md`.

---

## 🏗 Architectural Consistency

We follow a strict **Service-Oriented Architecture**. To maintain the codebase:

### 1. Backend Logic (Node/Express)
- **Routes (`backend/src/routes/`):** Define endpoints only. Use middleware for validation.
- **Controllers (`backend/src/controllers/`):** Extract request data and send it to Services. **Do not put business logic here.**
- **Services (`backend/src/services/`):** This is the heart of the app. 
  - All Stellar-specific logic (Horizon queries, memo matching) **must** go into `stellarService.js`.
  - Refer to the `API Reference` in the `README.md` when adding new endpoints.

### 2. Frontend Components (Next.js)
- Use **Functional Components** and **Tailwind CSS** (via `globals.css`).
- UI components live in `frontend/src/components/`.
- Page-level logic lives in `frontend/src/pages/`.
- All backend communication must use the centralized `frontend/src/services/api.js`.

---

## 🔐 Security & Stellar Protocols

As a blockchain-based payment system, security is paramount:
- **Environment Variables:** Refer to the [Environment Variables](#environment-variables) table in the `README.md`. Never hardcode the `SCHOOL_WALLET_ADDRESS`.
- **Memo Validation:** When implementing new payment types, always ensure the `studentId` is passed correctly in the Stellar Memo field.
- **Secret Keys:** Never log or store secret keys. Only use public keys for ledger lookups.

---

## 🧪 Testing Standards

We maintain a high bar for reliability. As stated in the [Running Tests](#running-tests) section of the `README.md`, we have 33+ passing tests.

- **Unit Tests:** Add to `tests/stellar.test.js` for logic involving amount normalization or transaction verification.
- **Integration Tests:** Add to `tests/payment.test.js` for full API flows (e.g., Register Student -> Get Instructions -> Verify).
- **Mocks:** We use `Jest` to mock the Stellar SDK. Look at existing tests to see how to simulate Horizon responses without hitting the actual network.

---

## 🛠 Step-by-Step Contribution Workflow

1. **Setup:** Follow the [Getting Started](#getting-started) guide in the `README.md` to ensure your local environment (Node, MongoDB, Docker) is functional.
2. **Branching:** Create a feature branch: `git checkout -b feat/your-feature`.
3. **Drafting:** If your change affects the API, update `docs/api-spec.md` first to align on the interface.
4. **Code:** Implement your changes across `backend/` and `frontend/`.
5. **Lint & Test:** ```bash
   npm test
   ```
6. **Documentation:** Update the [Project Structure](#project-structure) in the `README.md` if you add new core directories.

---

## 🤝 Pull Request Checklist
- [ ] PR follows [Conventional Commits](https://www.conventionalcommits.org/).
- [ ] PR description starts with "Closes #IssueNumber".
- [ ] New logic is covered by tests in the `tests/` directory.
- [ ] Documentation in `docs/` has been updated.

---
*Thank you for helping us eliminate manual reconciliation and fraud in school payments!*
