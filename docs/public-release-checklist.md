# Public Release Checklist

Before pushing this repository as public:

- Keep `.env`, `frontend/.env.local`, database volumes, logs, real-data screenshots, and `prompt.md` out of git.
- Use `.env.example` only for placeholders.
- Rotate any secret that was ever copied into a terminal, chat, issue, or commit.
- Verify the frontend bundle does not contain `API_TOKEN` or `VITE_API_TOKEN`.
- Make GitHub Container Registry packages public after the first successful image publish if the project is intended for `docker pull`.

Suggested local checks:

```bash
git status --short
rg -n --hidden -S "APP_PASSWORD|API_TOKEN|POSTGRES_PASSWORD|VITE_API_TOKEN|BEGIN .*PRIVATE" \
  -g '!node_modules/**' \
  -g '!frontend/node_modules/**' \
  -g '!backend/node_modules/**' \
  -g '!frontend/dist/**' \
  -g '!backend/dist/**' \
  -g '!.git/**'
```
