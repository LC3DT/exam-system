#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Building server..."
npx nest build -p packages/server/tsconfig.json

echo "Building admin..."
cd "$ROOT/packages/admin" && npx vite build 2>/dev/null || true

echo "Building exam portal..."
cd "$ROOT/packages/exam" && npx vite build 2>/dev/null || true

cd "$ROOT"

# Kill any existing processes on our ports
for port in 3000 5173 5174; do
    fuser -k $port/tcp 2>/dev/null || true
done

echo "Starting services..."
setsid bash -c "DATABASE_URL='file:./dev.db' JWT_SECRET='${JWT_SECRET:-exam-system-secret-key-2024}' node $ROOT/packages/server/dist/main.js" < /dev/null > /tmp/exam-server.log 2>&1 &
setsid bash -c "cd $ROOT/packages/admin && npx vite --port 5173 --host 0.0.0.0" < /dev/null > /tmp/exam-admin.log 2>&1 &
setsid bash -c "cd $ROOT/packages/exam && npx vite --port 5174 --host 0.0.0.0" < /dev/null > /tmp/exam-exam.log 2>&1 &

sleep 4
echo ""
echo "=== Service Status ==="
curl -s -o /dev/null -w "API:   HTTP %{http_code}\n" http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' || echo "API:   not ready"
curl -s -o /dev/null -w "Admin: HTTP %{http_code}\n" http://localhost:5173/ || echo "Admin: not ready"
curl -s -o /dev/null -w "Exam:  HTTP %{http_code}\n" http://localhost:5174/ || echo "Exam:  not ready"
echo "http://localhost:5173  admin/admin123"
echo "http://localhost:5174  student/student123"
