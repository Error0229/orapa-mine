.PHONY: help setup install dev-install sync format lint type-check test run migrate clean env

help:
	@echo "Available commands:"
	@echo "  setup         - Create virtual environment with uv"
	@echo "  install       - Install production dependencies"
	@echo "  dev-install   - Install all dependencies (prod + dev)"
	@echo "  sync          - Sync dependencies with pyproject.toml"
	@echo "  env           - Create .env file from .env.example"
	@echo "  format        - Format code with ruff"
	@echo "  lint          - Lint code with ruff"
	@echo "  type-check    - Type check with mypy"
	@echo "  test          - Run tests with pytest"
	@echo "  run           - Run the development server"
	@echo "  migrate       - Run database migrations"
	@echo "  clean         - Clean up generated files"

setup:
	uv venv
	@echo ""
	@echo "✓ Virtual environment created at .venv"
	@echo ""
	@echo "Activate it with:"
	@echo "  source .venv/bin/activate"
	@echo ""
	@echo "Then run: make dev-install"

install:
	uv pip install -e .

dev-install:
	uv pip install -e ".[dev]"

sync:
	uv pip sync

env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✓ Created .env file from .env.example"; \
		echo "⚠️  Please edit .env and update the values"; \
	else \
		echo "⚠️  .env already exists, skipping"; \
	fi

format:
	ruff format app/
	ruff check --fix app/

lint:
	ruff check app/

type-check:
	mypy app/

test:
	pytest tests/ -v

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

migrate:
	piccolo migrations forwards app

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
