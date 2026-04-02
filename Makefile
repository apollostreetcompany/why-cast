SHELL := /bin/zsh

.PHONY: install dev deploy test lint typecheck verify-deploy db-local

install:
	npm install

dev:
	npm run dev

deploy:
	npm run deploy

test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

verify-deploy:
	npm run typecheck
	npm run test

db-local:
	npm run db:local
