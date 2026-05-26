# Workout Tracker

A gym workout logging app with user accounts, admin approval, exercises, workout repeats, set/reps/weight logging, calendar history, result comparisons, body weight tracking, and exercise images.

## Host On Netlify

This project is ready for Netlify-style hosting:

- `public-online/` is the hosted app.
- `netlify/functions/api.mjs` is the secure backend API.
- `netlify.toml` tells Netlify how to publish the app and route `/api/*` requests.
- Workout data is stored with Netlify Blobs.

### Deploy Steps

1. Upload this project to GitHub, GitLab, or Bitbucket.
2. In Netlify, create a new site from that repository.
3. Netlify will read `netlify.toml`; the publish folder is `public-online`.
4. Add these environment variables in Netlify before going live:

```text
SESSION_SECRET=a-long-random-secret-value
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=a-strong-admin-password
```

The fallback admin login is only for local testing:

```text
admin@workout.local / 0000
```

Do not use that fallback admin account online.

## Local Backend Version

You can still run the custom Node backend locally:

```bash
node server/server.js
```

Then open:

```text
http://127.0.0.1:8080
```

If you need another port:

```bash
PORT=3000 node server/server.js
```

For the local backend, set:

```text
SESSION_SECRET=a-long-random-secret
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=a-strong-admin-password
PORT=8080
HOST=0.0.0.0
```

## Security Notes

- Passwords are hashed with PBKDF2 before storage.
- Login uses an HTTP-only signed session cookie.
- New user accounts require admin approval before login.
- Netlify deploys use HTTPS automatically.
- For larger scale, move the same API shape from Netlify Blobs to a database such as PostgreSQL.
