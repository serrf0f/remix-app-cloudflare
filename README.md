### Prerequisites
bun

### Use template
```
bunx create-remix@latest --template serrf0f/my-remix-app
```

### Migrate DB (local)
```
bun run db:dev --file=drizzle/0000_abandoned_wendigo.sql
bun run db:dev --file=drizzle/0001_good_katie_power.sql
```

### Run locally

Create a `.dev.vars` file at the root of your project:

```
CLOUDFLARE_TURNSTILE_SECRET=1x0000000000000000000000000000000AA
CLOUDFLARE_TURNSTILE_SITEKEY=1x00000000000000000000BB
POSTMARK_API_TOKEN = "[YOUR_POSTMARK_API_TOKEN]"
POSTMARK_DEFAULT_FROM = "[no-reply@yourdomain.com]"
```

Then run:

```
bun dev
```

### For the rest
> See scripts inside `package.json`
