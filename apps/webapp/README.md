# @showwhat/webapp

Web-based configurator UI for **showwhat** feature flag definitions.

## Getting the webapp

### From GitHub Releases

Download the latest `showwhat-webapp-v*.tgz` from the [Releases](https://github.com/yeojz/showwhat/releases) page.

```bash
# Extract the archive
tar -xzf showwhat-webapp-v1.0.0.tgz -C webapp
```

### Build from source

```bash
pnpm install
pnpm build:webapp
```

The output is in `apps/webapp/dist/`.

## Deployment

The webapp is a static single-page application — serve the extracted files with any static file server.

### Static file server

```bash
npx serve webapp
```

### Nginx

```nginx
server {
    listen 80;
    root /var/www/showwhat;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Subdirectory deployment

By default the webapp uses relative asset paths (`./`), so it works from any directory. If you need an explicit base path, rebuild with:

```bash
VITE_BASE_PATH=/your/path/ pnpm build:webapp
```
