<template>
  <footer class="ih-footer">
    <div class="ih-container ih-footer__inner">
      <p class="ih-footer__copy">&copy; {{ year }} Indy Hackers — made with love by volunteers</p>
      <nav class="ih-footer__links">
        <RouterLink to="/code-of-conduct" class="ih-footer__link">Code of Conduct</RouterLink>
        <RouterLink to="/terms" class="ih-footer__link">Terms of Service</RouterLink>
        <RouterLink to="/privacy" class="ih-footer__link">Privacy Policy</RouterLink>
      </nav>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'BottomLinkTree',
  computed: {
    year() {
      return new Date().getFullYear()
    }
  }
}
</script>

<style scoped>
.ih-footer {
  border-top: 1px solid color-mix(in srgb, var(--border) 15%, transparent);
  background: transparent;
  padding: 1.5rem 0;
}

.ih-footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.ih-footer__copy {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
  font-weight: normal;
}

.ih-footer__links {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.ih-footer__link {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-decoration: none;
  font-weight: normal;
}

.ih-footer__link:hover {
  color: var(--link-hover);
}

@media (max-width: 480px) {
  .ih-footer__inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
