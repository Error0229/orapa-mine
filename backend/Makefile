.PHONY: help install dev-install format lint type-check test run migrate clean

help:
	@echo "Available commands:"
	@echo "  install       - Install production dependencies with uv"
	@echo "  dev-install   - Install development dependencies with uv"
	@echo "  format        - Format code with ruff"
	@echo "  lint          - Lint code with ruff"
	@echo "  type-check    - Type check with mypy"
	@echo "  test          - Run tests with pytest"
	@echo "  run           - Run the development server"
	@echo "  migrate       - Run database migrations"
	@echo "  clean         - Clean up generated files"

install:
	uv pip install -e .

dev-install:
	uv pip install -e ".[dev]"

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
