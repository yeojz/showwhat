<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import FormatToggle from "./FormatToggle.vue";

const format = ref("yaml");
const activeTime = ref(0);
let timeInterval = null;

const timeSteps = [
  { time: "01:00 UTC", value: "null", active: false },
  { time: "02:00 UTC", value: '"Deployment in progress"', active: true },
  { time: "04:30 UTC", value: '"Deployment in progress"', active: true },
  { time: "07:00 UTC", value: "null", active: false },
  { time: "12:00 UTC", value: "null", active: false },
];

onMounted(() => {
  let step = 0;
  timeInterval = setInterval(() => {
    step = (step + 1) % timeSteps.length;
    activeTime.value = step;
  }, 2000);
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});
</script>

<template>
  <section class="time-section">
    <div class="time-inner">
      <div class="time-text">
        <h2>Time windows are rules, not cron jobs.</h2>
        <p>
          Rules resolve top-to-bottom. Time windows, environment matching, and catch-all defaults
          compose in the same definition. No special syntax. No separate scheduling interface.
        </p>
        <div class="time-results">
          <div
            v-for="(step, i) in timeSteps"
            :key="i"
            class="time-row"
            :class="{ 'is-current': activeTime === i }"
          >
            <span class="time-clock">{{ step.time }}</span>
            <span class="time-val" :class="step.active ? 'is-active' : 'is-null'">
              {{ step.value }}
            </span>
          </div>
        </div>
      </div>
      <div class="time-yaml">
        <div class="code-tab-row">
          <div class="code-tab">{{ format === "yaml" ? "flags.yaml" : "flags.json" }}</div>
          <FormatToggle v-model="format" />
        </div>
        <pre
          v-show="format === 'yaml'"
          class="code-block"
        ><code><span class="hl-key">definitions</span>:
  <span class="hl-key">maintenance_mode</span>:
    <span class="hl-key">variations</span>:
      - <span class="hl-key">value</span>: <span class="hl-str">"Deployment in progress"</span>
        <span class="hl-key">conditions</span>:
          - <span class="hl-key">type</span>: <span class="hl-str">env</span>
            <span class="hl-key">value</span>: <span class="hl-str">prod</span>
          - <span class="hl-key">type</span>: <span class="hl-str">startAt</span>
            <span class="hl-key">value</span>: <span class="hl-str">"2026-03-03T02:00Z"</span>
          - <span class="hl-key">type</span>: <span class="hl-str">endAt</span>
            <span class="hl-key">value</span>: <span class="hl-str">"2026-03-03T07:00Z"</span>
      - <span class="hl-key">value</span>: <span class="hl-null">null</span></code></pre>
        <pre v-show="format === 'json'" class="code-block"><code>{
  <span class="hl-key">"definitions"</span>: {
    <span class="hl-key">"maintenance_mode"</span>: {
      <span class="hl-key">"variations"</span>: [
        {
          <span class="hl-key">"value"</span>: <span class="hl-str">"Deployment in progress"</span>,
          <span class="hl-key">"conditions"</span>: [
            { <span class="hl-key">"type"</span>: <span class="hl-str">"env"</span>, <span class="hl-key">"value"</span>: <span class="hl-str">"prod"</span> },
            { <span class="hl-key">"type"</span>: <span class="hl-str">"startAt"</span>, <span class="hl-key">"value"</span>: <span class="hl-str">"2026-03-03T02:00Z"</span> },
            { <span class="hl-key">"type"</span>: <span class="hl-str">"endAt"</span>, <span class="hl-key">"value"</span>: <span class="hl-str">"2026-03-03T07:00Z"</span> }
          ]
        },
        { <span class="hl-key">"value"</span>: <span class="hl-null">null</span> }
      ]
    }
  }
}</code></pre>
      </div>
    </div>
  </section>
</template>
