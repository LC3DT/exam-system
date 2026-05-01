#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Building server..."
npx nest build -p packages/server/tsconfig.json

setsid bash -c "DATABASE_URL='file:./dev.db' node $ROOT/packages/server/dist/main.js" < /dev/null > /tmp/exam-server.log 2>&1 &
setsid bash -c "cd $ROOT/packages/admin && npx vite --port 5173 --host 0.0.0.0" < /dev/null > /tmp/exam-admin.log 2>&1 &
setsid bash -c "cd $ROOT/packages/exam && npx vite --port 5174 --host 0.0.0.0" < /dev/null > /tmp/exam-exam.log 2>&1 &

sleep 4
echo ""
echo "=== Service Status ==="
curl -s -o /dev/null -w "API:   HTTP %{http_code}\n" http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
curl -s -o /dev/null -w "Admin: HTTP %{http_code}\n" http://localhost:5173/
curl -s -o /dev/null -w "Exam:  HTTP %{http_code}\n" http://localhost:5174/
echo "http://localhost:5173  admin/admin123"
echo "http://localhost:5174  student/student123"
