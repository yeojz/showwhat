# @showwhat/webapp

Standalone browser app for authoring and testing **showwhat** definitions.

The webapp packages the showwhat configurator: a visual editor for building rules, previewing resolution, and exporting YAML or JSON definitions.

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

## Documentation

- [Configurator overview](https://showwhat.yeojz.dev/docs/configurator)
- [Getting Started](https://showwhat.yeojz.dev/docs/configurator-getting-started) for a quick walkthrough
- [Editing Definitions](https://showwhat.yeojz.dev/docs/configurator-editing) for the full editing workflow
- [Sources](https://showwhat.yeojz.dev/docs/configurator-sources) for loading from files and remote endpoints
- [Presets](https://showwhat.yeojz.dev/docs/configurator-presets) for reusable condition presets
- [Using the Library](https://showwhat.yeojz.dev/docs/configurator-using-the-library) to embed the configurator in your own React app
