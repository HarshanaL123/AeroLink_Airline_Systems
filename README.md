# ✈️ AeroLink Airline Systems

> Cloud-native, microservices-based airline platform built on AWS.

## Architecture

AeroLink is composed of **5 independent microservices** communicating via REST APIs and event-driven architecture (AWS EventBridge + SQS).

| Service | Port | Description |
|---------|------|-------------|
| **Auth Service** | 4001 | Authentication, JWT tokens, RBAC |
| **Flight Service** | 4002 | Flight management, search, seat maps |
| **Booking Service** | 4003 | Reservations, payments, seat allocation |
| **Baggage Service** | 4004 | Baggage tracking, status updates |
| **Notification Service** | Lambda | Event-driven notifications |

## Tech Stack

- **Backend**: Node.js (Express.js)
- **Frontend**: React / Next.js
- **Database**: AWS DynamoDB + ElastiCache (Redis)
- **Messaging**: AWS EventBridge + SQS + SNS
- **Containerization**: Docker + AWS EKS
- **Serverless**: AWS Lambda
- **IaC**: Terraform
- **CI/CD**: GitHub Actions
- **Monitoring**: AWS CloudWatch + X-Ray

## Quick Start (Local Development)

### Prerequisites
- Node.js >= 22.0.0
- Docker & Docker Compose
- AWS CLI configured
- Terraform >= 1.5.0

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd AeroLink_Airline_Systems

# Install dependencies for all services
npm install

# Copy environment files
cp services/auth-service/.env.example services/auth-service/.env
cp services/flight-service/.env.example services/flight-service/.env
cp services/booking-service/.env.example services/booking-service/.env
cp services/baggage-service/.env.example services/baggage-service/.env

# Start all services with Docker Compose
docker-compose up --build

# Seed the database with demo data
npm run seed
```

### Service Health Checks
```bash
curl http://localhost:4001/health  # Auth Service
curl http://localhost:4002/health  # Flight Service
curl http://localhost:4003/health  # Booking Service
curl http://localhost:4004/health  # Baggage Service
```

## AWS Deployment

```bash
# Deploy infrastructure
cd terraform
terraform init
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"

# Destroy infrastructure (stop all services)
terraform destroy -var-file="environments/dev.tfvars"
```

## Testing

```bash
# Run all unit tests
npm test

# Run tests for a specific service
cd services/auth-service && npm test
```

## API Documentation

API documentation is available at `/api-docs` when the services are running, or view the OpenAPI spec at `api-docs/openapi.yaml`.

## Project Structure

```
AeroLink_Airline_Systems/
├── terraform/              # Infrastructure as Code
├── services/               # Backend Microservices
│   ├── auth-service/
│   ├── flight-service/
│   ├── booking-service/
│   ├── baggage-service/
│   └── notification-service/
├── frontend/               # React / Next.js
├── api-docs/               # Swagger / OpenAPI
├── scripts/                # Utility scripts
├── .github/workflows/      # CI/CD Pipeline
└── docker-compose.yml      # Local development
```

## License

MIT
