SHELL := /bin/zsh
PAGES_PROJECT ?= why-cast
PAGES_API_BASE_URL ?= https://why-cast.ryan-borker.workers.dev

.PHONY: install dev deploy prepare-pages deploy-pages test lint typecheck verify-deploy db-local

install:
	npm install

dev:
	npm run dev

deploy:
	npm run deploy

prepare-pages:
	VITE_API_BASE_URL=$(PAGES_API_BASE_URL) npm run build
	rm -rf .pages-dist
	cp -R dist .pages-dist
	printf '/* /index.html 200\n' > .pages-dist/_redirects

deploy-pages: prepare-pages
	npx wrangler pages deploy .pages-dist --project-name $(PAGES_PROJECT) --branch main --commit-dirty=true

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
