SERVICES := auth-service schedule-service
COMPOSE  := docker compose

.DEFAULT_GOAL := help
.PHONY: help setup install dev-auth dev-schedule build lint test e2e migrate up down logs clean

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

setup: ## Create any missing .env file from its .env.example (root and each service)
	@for dir in . $(SERVICES); do \
		if [ ! -f $$dir/.env ]; then cp $$dir/.env.example $$dir/.env && echo "created $$dir/.env"; fi; \
	done

install: ## Install dependencies and generate the Prisma client in every service
	@for s in $(SERVICES); do (cd $$s && pnpm install && pnpm exec prisma generate) || exit 1; done

dev-auth: ## Run auth-service locally with reload (port 3001)
	cd auth-service && pnpm start:dev

dev-schedule: ## Run schedule-service locally with reload (port 3002)
	cd schedule-service && pnpm start:dev

build: ## Build every service
	@for s in $(SERVICES); do (cd $$s && pnpm build) || exit 1; done

lint: ## Lint every service
	@for s in $(SERVICES); do (cd $$s && pnpm lint) || exit 1; done

test: ## Run unit tests in every service
	@for s in $(SERVICES); do (cd $$s && pnpm test) || exit 1; done

e2e: ## Run e2e tests in every service
	@for s in $(SERVICES); do (cd $$s && pnpm test:e2e) || exit 1; done

migrate: ## Apply Prisma migrations to the databases in each service's .env
	@for s in $(SERVICES); do (cd $$s && pnpm exec prisma migrate deploy) || exit 1; done

up: ## Build and start everything with Docker Compose
	$(COMPOSE) up --build -d

down: ## Stop the Docker Compose stack
	$(COMPOSE) down

logs: ## Follow the logs of the Docker Compose stack
	$(COMPOSE) logs -f

clean: ## Stop the stack and delete its database volumes (destroys data)
	$(COMPOSE) down -v
