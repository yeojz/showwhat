<template>
  <div class="hero-section">
    <section class="hero">
      <div class="hero-text">
        <h1>Feature flags and config you own. Platform-agnostic.</h1>
        <p class="hero-sub">
          Define rules in YAML or JSON. Evaluate them in your app. Store them wherever you want.
        </p>
        <div class="hero-actions">
          <a href="/docs/" class="btn btn-primary">Get started</a>
          <a href="/configurator/" target="_blank" class="btn btn-ghost">Try the configurator</a>
        </div>
        <div class="hero-install">
          <code>npm install showwhat</code>
        </div>
      </div>
      <div class="hero-visual">
        <div class="browser-mock">
          <div class="browser-bar">
            <span class="browser-dot"></span>
            <span class="browser-dot"></span>
            <span class="browser-dot"></span>
            <span class="browser-url">showwhat.yeojz.dev/configurator</span>
          </div>
          <div class="browser-body">
            <div class="mock-sidebar">
              <div class="mock-sidebar-title">Definitions</div>
              <div class="mock-flag mock-flag-active">checkout_v2</div>
              <div class="mock-flag">maintenance_mode</div>
              <div class="mock-flag">dark_mode</div>
            </div>
            <div class="mock-main">
              <div class="mock-editor-header">
                <span class="mock-flag-name">checkout_v2</span>
                <span class="mock-tag">boolean</span>
              </div>
              <div class="mock-variation">
                <div class="mock-var-row">
                  <span class="mock-var-badge on">true</span>
                  <span class="mock-var-condition">env = prod</span>
                </div>
                <div class="mock-var-row">
                  <span class="mock-var-badge off">false</span>
                  <span class="mock-var-condition mock-default">default</span>
                </div>
              </div>
              <div class="mock-preview">
                <div class="mock-preview-label">Preview</div>
                <div class="mock-preview-row">
                  <span>env: "prod"</span>
                  <span class="mock-result on">true</span>
                </div>
                <div class="mock-preview-row">
                  <span>env: "staging"</span>
                  <span class="mock-result off">false</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="trust-strip">
      <div class="trust-item">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        MIT Licensed
      </div>
      <div class="trust-sep"></div>
      <div class="trust-item">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        Minimal Dependencies
      </div>
      <div class="trust-sep"></div>
      <div class="trust-item">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        Multi-Runtime
      </div>
      <div class="trust-sep"></div>
      <div class="trust-item">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
        TypeScript First
      </div>
    </div>
  </div>
</template>
