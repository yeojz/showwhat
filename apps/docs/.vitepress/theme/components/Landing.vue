<script setup>
import HeroSection from "./landing/HeroSection.vue";
import BenefitsSection from "./landing/BenefitsSection.vue";
import HowItWorks from "./landing/HowItWorks.vue";
import TimeDemo from "./landing/TimeDemo.vue";
import SdkTabs from "./landing/SdkTabs.vue";
import CtaSection from "./landing/CtaSection.vue";
import { useForceDark } from "../composables/useForceDark";

useForceDark();
</script>

<template>
  <div class="landing">
    <HeroSection />
    <BenefitsSection />
    <HowItWorks />
    <TimeDemo />
    <SdkTabs />
    <CtaSection />
    <footer class="landing-footer">
      <p>&copy; 2026 Gerald Yeo. MIT Licensed.</p>
    </footer>
  </div>
</template>
