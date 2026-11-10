#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_CLASSES="$(mktemp -d)"
trap 'rm -rf "$TASK_CLASSES"' EXIT
javac -d "$TASK_CLASSES" "$TASK_ROOT/src/main/java/pe/vales/domain/ReglaException.java" "$TASK_ROOT/src/main/java/pe/vales/domain/ConsumoPolicy.java" "$TASK_ROOT/scripts/PolicyCheck.java"
java -cp "$TASK_CLASSES" PolicyCheck
