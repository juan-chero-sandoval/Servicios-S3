.PHONY: gate test domain frontend demo jar clean

gate: test domain

test:
	./gradlew check bootJar

domain:
	bash scripts/verificar-dominio.sh

frontend:
	node scripts/test-frontend.cjs

demo:
	./gradlew bootRun

jar:
	./gradlew bootJar

clean:
	./gradlew clean
