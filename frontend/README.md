# Frontend: Real-Time Collaborative Code Editor

This Next.js frontend is integrated with the Spring Boot backend and now uses a page-based flow:

1. `/login` for JWT auth
2. `/documents` for document CRUD list/create/delete
3. `/editor/[id]` for editing, session actions, and code execution

## Required Environment

Create `.env.local` in this `frontend` folder with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

If your backend runs on another host/port, update the value accordingly.

## Run Order

1. Start backend first (from `../backend`), ensuring MySQL is reachable.
2. Start frontend:

```bash
npm install
npm run dev
```

3. Open `http://localhost:3000`.

## Backend CORS Requirement

Backend must allow frontend origin (default is already configured):

- `APP_CORS_ALLOWED_ORIGINS=http://localhost:3000`

If frontend is on a different origin, set backend env to match it.

## Troubleshooting "Failed to fetch"

If you see fetch errors on login/documents/editor:

1. Confirm backend is running on `NEXT_PUBLIC_API_BASE_URL`.
2. Confirm backend CORS includes frontend origin.
3. Confirm backend has valid datasource/JWT env values.
4. Check browser devtools network tab for blocked requests.
