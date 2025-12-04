# Budget API

RESTful API for the Budget App personal finance management system. Built with NestJS and MongoDB.

![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 🔐 **Authentication** — JWT-based auth with secure password hashing
- 💳 **Transactions** — CRUD operations for income and expenses
- 📅 **Bills** — Manage recurring bills and payment schedules
- 📁 **Categories** — Organize transactions by custom categories
- 👤 **User Management** — Multi-user support with isolated data

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Framework      | NestJS 10                         |
| Language       | TypeScript 5                      |
| Database       | MongoDB with Mongoose ODM         |
| Authentication | Passport.js, JWT                  |
| Validation     | class-validator, class-transformer|
| Deployment     | Heroku                            |
| CI/CD          | GitHub Actions                    |

## API Endpoints

### Authentication
| Method | Endpoint         | Description          |
|--------|------------------|----------------------|
| POST   | `/auth/register` | Register new user    |
| POST   | `/auth/login`    | Login, returns JWT   |

### Transactions
| Method | Endpoint            | Description              |
|--------|---------------------|--------------------------|
| GET    | `/transactions`     | List all transactions    |
| POST   | `/transactions`     | Create transaction       |
| GET    | `/transactions/:id` | Get transaction by ID    |
| PATCH  | `/transactions/:id` | Update transaction       |
| DELETE | `/transactions/:id` | Delete transaction       |

### Bills
| Method | Endpoint      | Description        |
|--------|---------------|--------------------|
| GET    | `/bills`      | List all bills     |
| POST   | `/bills`      | Create bill        |
| GET    | `/bills/:id`  | Get bill by ID     |
| PATCH  | `/bills/:id`  | Update bill        |
| DELETE | `/bills/:id`  | Delete bill        |

### Categories
| Method | Endpoint          | Description          |
|--------|-------------------|----------------------|
| GET    | `/categories`     | List all categories  |
| POST   | `/categories`     | Create category      |
| PATCH  | `/categories/:id` | Update category      |
| DELETE | `/categories/:id` | Delete category      |

> ⚠️ Update this section to match your actual endpoints

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/acastillo9/budget-api.git
cd budget-api

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

| Variable          | Description                      | Example                          |
|-------------------|----------------------------------|----------------------------------|
| `PORT`            | Server port                      | `3000`                           |
| `MONGODB_URI`     | MongoDB connection string        | `mongodb://localhost:27017/budget` |
| `JWT_SECRET`      | Secret key for JWT signing       | `your-secret-key`                |
| `JWT_EXPIRES_IN`  | Token expiration time            | `7d`                             |

### Running the App

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Project Structure

```
src/
├── auth/              # Authentication module (JWT, guards)
├── users/             # User module
├── transactions/      # Transactions module
├── bills/             # Bills module
├── categories/        # Categories module
├── common/            # Shared decorators, pipes, filters
└── main.ts            # Application entry point
```

## Related

- [budget-ui](https://github.com/acastillo9/budget-ui) — Svelte frontend for this API

## License

MIT

---

Built with ☕ by [Andrés Castillo](https://github.com/acastillo9)
