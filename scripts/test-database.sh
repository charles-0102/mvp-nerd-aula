#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for tool in initdb pg_ctl psql; do
  command -v "$tool" >/dev/null || { echo "Falta $tool. Instale PostgreSQL 15+ para executar os testes isolados."; exit 1; }
done
test_dir=$(mktemp -d /tmp/central-demandas-pg.XXXXXX)
test_port=55439
cleanup() {
  pg_ctl -D "$test_dir/data" -m immediate stop >/dev/null 2>&1 || true
  echo "Logs do teste: $test_dir (nenhum banco remoto foi usado)."
}
trap cleanup EXIT
initdb -D "$test_dir/data" --auth=trust --no-locale -E UTF8 >"$test_dir/init.log"
pg_ctl -D "$test_dir/data" -l "$test_dir/server.log" -o "-F -h 127.0.0.1 -p $test_port -k $test_dir" -w start >/dev/null
test_psql=(psql -X -h "$test_dir" -p "$test_port" -d postgres -v ON_ERROR_STOP=1)
"${test_psql[@]}" -f tests/bootstrap.sql >"$test_dir/bootstrap.log"
for migration in supabase/migrations/*.sql; do
  "${test_psql[@]}" -f "$migration" >>"$test_dir/migration.log"
done
"${test_psql[@]}" -f tests/database.sql >"$test_dir/results.log"
echo "Migração e verificações de permissões, atomicidade e versões desatualizadas: PASSARAM."
echo "As identidades são fixtures; autenticação HTTP real precisa da integração com Supabase."
