<script setup>
defineProps({
  modelValue: {
    type: String,
    default: "yaml",
  },
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="format-toggle">
    <button
      class="fmt-tab"
      :class="{ 'is-active': modelValue === 'yaml' }"
      @click="$emit('update:modelValue', 'yaml')"
    >
      YAML
    </button>
    <button
      class="fmt-tab"
      :class="{ 'is-active': modelValue === 'json' }"
      @click="$emit('update:modelValue', 'json')"
    >
      JSON
    </button>
  </div>
</template>
