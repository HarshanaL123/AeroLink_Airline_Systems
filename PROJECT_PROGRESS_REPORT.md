# AeroLink Airline Systems — Project Progress Report

> **Project Goal:** Design and implement a secure, scalable, and highly available cloud-based airline reservation system using microservices architecture.
> **Current Status:** Phase 1 Complete (Foundation & Auth Service)
> **Last Updated:** Day 2 (May 22, 2026)

This document serves as a living history of the project's development. It tracks daily progress, key architectural decisions, and acts as a central handover document for future phases.

---

## 📅 Day 1: Project Foundation & Infrastructure Blueprints
**Date:** May 21, 2026

### ✅ Tasks Completed
- **Source Control Initialization:** Established the GitHub repository, base folder structure, and secure `.gitignore`.
- **Microservices Skeleton:** Generated the foundational Node.js/Express frameworks for all four core services (`auth-service`, `flight-service`, `booking-service`, `baggage-service`).
- **Containerization Strategy (Enhancement #5):** Implemented highly optimized, multi-stage Dockerfiles for all services. Enforced non-root `appuser` execution for enterprise-grade container security.
- **Local Development Architecture:** Engineered a unified `docker-compose.yml` to instantly spin up all services alongside a local DynamoDB simulator (avoiding AWS charges during development). Fixed Windows Hyper-V port conflicts by mapping to the 4000 port range.
- **Infrastructure as Code (Terraform):** 
  - Created modular Terraform structure.
  - Built `iam` module with least-privilege execution roles for future ECS and Lambda services.
  - Built `dynamodb` module mapping all 7 required tables with `PAY_PER_REQUEST` billing mode to strictly protect the $122 AWS Free Tier budget.

### 🧠 Architectural Decisions
- Chosen **DynamoDB Local** over live AWS for local development to ensure 0 cost during the coding phase.
- Selected **Multi-Stage Docker Builds** to drastically reduce image sizes for faster future ECR uploads.

### 📌 Future Reminders & Considerations
- *When deploying to AWS (Day 9):* We must change the Dockerfiles from `npm install` back to `npm ci` for deterministic production builds.

---

## 📅 Day 2: Auth Service & API Gateway Foundation
**Date:** May 22, 2026

### ✅ Tasks Completed
- **Registration API:** Implemented `/api/v1/auth/register` using AWS SDK to securely store users in DynamoDB.
- **Login API & JWT:** Implemented `/api/v1/auth/login` to authenticate users and issue secure, time-limited JSON Web Tokens (JWT).
- **Security & Compliance (Assignment Task 3):**
  - Integrated `bcryptjs` for secure password hashing (passwords are never stored in plain text).
  - Built custom **Role-Based Access Control (RBAC)** middleware (`protect` and `authorize`) to restrict routes based on user roles (e.g., admin, staff, passenger).
- **DDoS Protection (Enhancement #4):** Implemented `express-rate-limit` to restrict the Auth API to 100 requests per 15 minutes per IP address.
- **API Gateway Blueprints (Enhancement #3):** Created the Terraform `api_gateway` module to act as the single front door for the system, enforcing the `/api/v1/` routing standard.
- **Automated Unit Testing:** Achieved **76.92% code coverage** using Jest and Supertest. Successfully mocked the DynamoDB layer to ensure tests are fast, isolated, and safe.

### 🧠 Architectural Decisions
- Handled API Versioning at the **API Gateway** level rather than just the code level. This ensures all traffic is properly routed and versioned before it even hits the microservices.
- Utilized DB Mocking in Jest to ensure CI/CD pipelines (Day 12) run swiftly without needing a live database connection.

### 📌 Future Reminders & Considerations
- *For Day 11 (Performance Testing):* The rate limiter (100 requests / 15 min) will intentionally block load tests. We must ensure we either bypass the rate limiter during internal load testing or raise the limit temporarily.
- *For Phase 3 (Frontend):* Ensure the React/Next.js frontend securely stores the issued JWT token (preferably in HttpOnly cookies or secure local storage) to maintain the security established today.
