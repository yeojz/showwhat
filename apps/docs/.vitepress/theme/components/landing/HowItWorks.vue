<script setup>
import { ref } from "vue";
import FormatToggle from "./FormatToggle.vue";

const format = ref("yaml");
</script>

<template>
  <div class="how-section">
    <section class="how">
      <div>
        <h2>Define once, evaluate anywhere.</h2>
        <p class="how-sub">
          The definition is the contract between authors and runtime. Write it in YAML or JSON,
          then resolve it with one function call.
        </p>
      </div>
      <div class="how-demo">
        <div class="how-file">
          <div class="code-tab-row">
            <div class="code-tab">{{ format === "yaml" ? "flags.yaml" : "flags.json" }}</div>
            <FormatToggle v-model="format" />
          </div>
          <pre
            v-show="format === 'yaml'"
            class="code-block"
          ><code><span class="hl-key">definitions</span>:
  <span class="hl-key">checkout_v2</span>:
    <span class="hl-key">variations</span>:
      - <span class="hl-key">value</span>: <span class="hl-bool">true</span>
        <span class="hl-key">conditions</span>:
          - <span class="hl-key">type</span>: <span class="hl-str">env</span>
            <span class="hl-key">value</span>: <span class="hl-str">prod</span>
      - <span class="hl-key">value</span>: <span class="hl-bool">false</span></code></pre>
          <pre v-show="format === 'json'" class="code-block"><code>{
  <span class="hl-key">"definitions"</span>: {
    <span class="hl-key">"checkout_v2"</span>: {
      <span class="hl-key">"variations"</span>: [
        {
          <span class="hl-key">"value"</span>: <span class="hl-bool">true</span>,
          <span class="hl-key">"conditions"</span>: [
            { <span class="hl-key">"type"</span>: <span class="hl-str">"env"</span>, <span class="hl-key">"value"</span>: <span class="hl-str">"prod"</span> }
          ]
        },
        { <span class="hl-key">"value"</span>: <span class="hl-bool">false</span> }
      ]
    }
  }
}</code></pre>
        </div>
        <div class="how-code">
          <div class="code-tab">app.ts</div>
          <pre
            v-show="format === 'yaml'"
            class="code-block"
          ><code><span class="hl-kw">import</span> { showwhat, MemoryData } <span class="hl-kw">from</span> <span class="hl-str">"showwhat"</span>;

<span class="hl-kw">const</span> data = <span class="hl-kw">await</span> MemoryData.<span class="hl-fn">fromYaml</span>(yaml);
<span class="hl-kw">const</span> result = <span class="hl-kw">await</span> <span class="hl-fn">showwhat</span>({
  key: <span class="hl-str">"checkout_v2"</span>,
  context: { env: <span class="hl-str">"prod"</span> },
  options: { data },
});

result.value; <span class="hl-cmt">// true</span></code></pre>
          <pre
            v-show="format === 'json'"
            class="code-block"
          ><code><span class="hl-kw">import</span> { showwhat, MemoryData } <span class="hl-kw">from</span> <span class="hl-str">"showwhat"</span>;

<span class="hl-kw">const</span> data = MemoryData.<span class="hl-fn">fromObject</span>(JSON.<span class="hl-fn">parse</span>(json));
<span class="hl-kw">const</span> result = <span class="hl-kw">await</span> <span class="hl-fn">showwhat</span>({
  key: <span class="hl-str">"checkout_v2"</span>,
  context: { env: <span class="hl-str">"prod"</span> },
  options: { data },
});

result.value; <span class="hl-cmt">// true</span></code></pre>
        </div>
      </div>
      <p class="how-note">
        Load definitions from memory, files, or your own API. The
        <a href="/docs/data-sources"><code>DefinitionReader</code></a> interface stays the same.
      </p>
    </section>
  </div>
</template>
