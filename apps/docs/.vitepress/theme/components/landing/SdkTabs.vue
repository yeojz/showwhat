<script setup>
import { ref } from "vue";

const activeTab = ref("node");

const sdkTabs = [
  { id: "node", label: "Node.js" },
  { id: "openfeature", label: "OpenFeature" },
  // { id: "edge", label: "Edge / Serverless" },
  { id: "deno", label: "Deno" },
  { id: "bun", label: "Bun" },
];
</script>

<template>
  <div class="sdk-section">
    <section class="sdk">
      <div class="sdk-left">
        <h2>Works everywhere JavaScript runs.</h2>
        <p>
          The core uses Web Standard APIs only. Zero Node.js-specific dependencies. Pick your
          runtime, import, and go.
        </p>
      </div>
      <div class="sdk-right">
        <div class="sdk-tabs">
          <button
            v-for="tab in sdkTabs"
            :key="tab.id"
            class="sdk-tab"
            :class="{ 'is-active': activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="sdk-code-wrap">
          <pre
            v-show="activeTab === 'node'"
            class="code-block"
          ><code><span class="hl-kw">import</span> { showwhat, MemoryData } <span class="hl-kw">from</span> <span class="hl-str">"@showwhat/core"</span>;
<span class="hl-kw">import</span> { readFile } <span class="hl-kw">from</span> <span class="hl-str">"node:fs/promises"</span>;

<span class="hl-kw">const</span> yaml = <span class="hl-kw">await</span> <span class="hl-fn">readFile</span>(<span class="hl-str">"./flags.yaml"</span>, <span class="hl-str">"utf-8"</span>);
<span class="hl-kw">const</span> data = <span class="hl-kw">await</span> MemoryData.<span class="hl-fn">fromYaml</span>(yaml);
<span class="hl-kw">const</span> result = <span class="hl-kw">await</span> <span class="hl-fn">showwhat</span>({
  key: <span class="hl-str">"checkout_v2"</span>,
  context: { env: <span class="hl-str">"prod"</span> },
  options: { data },
});</code></pre>
          <pre
            v-show="activeTab === 'openfeature'"
            class="code-block"
          ><code><span class="hl-kw">import</span> { OpenFeature } <span class="hl-kw">from</span> <span class="hl-str">"@openfeature/server-sdk"</span>;
<span class="hl-kw">import</span> { ShowwhatProvider } <span class="hl-kw">from</span> <span class="hl-str">"@showwhat/openfeature"</span>;
<span class="hl-kw">import</span> { MemoryData } <span class="hl-kw">from</span> <span class="hl-str">"@showwhat/core"</span>;

<span class="hl-kw">const</span> data = <span class="hl-kw">await</span> MemoryData.<span class="hl-fn">fromYaml</span>(yaml);
<span class="hl-kw">await</span> OpenFeature.<span class="hl-fn">setProviderAndWait</span>(
  <span class="hl-kw">new</span> <span class="hl-fn">ShowwhatProvider</span>({ data })
);

<span class="hl-kw">const</span> client = OpenFeature.<span class="hl-fn">getClient</span>();
<span class="hl-kw">const</span> result = <span class="hl-kw">await</span> client.<span class="hl-fn">getBooleanValue</span>(
  <span class="hl-str">"checkout_v2"</span>, <span class="hl-bool">false</span>, { env: <span class="hl-str">"prod"</span> }
);</code></pre>
          <pre
            v-show="activeTab === 'edge'"
            class="code-block"
          ><code><span class="hl-kw">import</span> { showwhat, MemoryData } <span class="hl-kw">from</span> <span class="hl-str">"@showwhat/core"</span>;

<span class="hl-kw">const</span> yaml = <span class="hl-kw">await</span> <span class="hl-fn">fetch</span>(CONFIG_URL).then(r =&gt; r.text());
<span class="hl-kw">const</span> data = <span class="hl-kw">await</span> MemoryData.<span class="hl-fn">fromYaml</span>(yaml);

<span class="hl-kw">const</span> result = <span class="hl-kw">await</span> <span class="hl-fn">showwhat</span>({
  key: <span class="hl-str">"checkout_v2"</span>,
  context: { env: <span class="hl-str">"prod"</span> },
  options: { data },
});</code></pre>
          <pre
            v-show="activeTab === 'deno'"
            class="code-block"
          ><code><span class="hl-kw">import</span> { showwhat, MemoryData } <span class="hl-kw">from</span> <span class="hl-str">"npm:@showwhat/core"</span>;

<span class="hl-kw">const</span> yaml = <span class="hl-kw">await</span> Deno.<span class="hl-fn">readTextFile</span>(<span class="hl-str">"./flags.yaml"</span>);
<span class="hl-kw">const</span> data = <span class="hl-kw">await</span> MemoryData.<span class="hl-fn">fromYaml</span>(yaml);

<span class="hl-kw">const</span> result = <span class="hl-kw">await</span> <span class="hl-fn">showwhat</span>({
  key: <span class="hl-str">"checkout_v2"</span>,
  context: { env: <span class="hl-str">"prod"</span> },
  options: { data },
});</code></pre>
          <pre
            v-show="activeTab === 'bun'"
            class="code-block"
          ><code><span class="hl-kw">import</span> { showwhat, MemoryData } <span class="hl-kw">from</span> <span class="hl-str">"@showwhat/core"</span>;

<span class="hl-kw">const</span> yaml = <span class="hl-kw">await</span> Bun.<span class="hl-fn">file</span>(<span class="hl-str">"./flags.yaml"</span>).text();
<span class="hl-kw">const</span> data = <span class="hl-kw">await</span> MemoryData.<span class="hl-fn">fromYaml</span>(yaml);

<span class="hl-kw">const</span> result = <span class="hl-kw">await</span> <span class="hl-fn">showwhat</span>({
  key: <span class="hl-str">"checkout_v2"</span>,
  context: { env: <span class="hl-str">"prod"</span> },
  options: { data },
});</code></pre>
        </div>
      </div>
    </section>
  </div>
</template>
