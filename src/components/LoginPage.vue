<template>
  <div class="login-page">
    <AuthPageLayout title="Log in with">
      <div class="oauth-section">
        <div v-for="provider in oauthProviders" :key="provider.name">
          <b-button
            :id="'btn-' + provider.name"
            class="ih-btn-outline oauth-icon-btn"
            @click="loginWithOAuth(provider.name)"
          >
            <template v-if="provider.name === 'github'">
              <IFaGithub />
            </template>
            <template v-else-if="provider.name === 'google'">
              <IFaGoogle />
            </template>
            <template v-else-if="provider.name === 'facebook'">
              <IFaFacebook />
            </template>
            <template v-else-if="provider.name === 'twitter'">
              <IFaTwitter />
            </template>
            <template v-else-if="provider.name === 'linkedin'">
              <IFaLinkedin />
            </template>
            <template v-else-if="provider.name === 'microsoft'">
              <IMdiMicrosoft />
            </template>
            <template v-else-if="provider.name === 'apple'">
              <IFaApple />
            </template>
            <template v-else-if="provider.name === 'discord'">
              <ICarbonLogoDiscord />
            </template>
            <template v-else>
              <IFaOpenid />
            </template>
          </b-button>
          <b-tooltip :target="'btn-' + provider.name" triggers="hover">
            {{ provider.displayName }}
          </b-tooltip>
          <h3 class="mt-3 mb-3">or</h3>
        </div>
      </div>
      <b-form @submit.prevent="login">
        <b-form-group class="form-group" label="Email" label-for="email" label-class="form-label">
          <b-form-input id="email" v-model="email" type="email" required></b-form-input>
        </b-form-group>

        <b-form-group class="form-group" label="Password" label-for="password">
          <b-form-input id="password" v-model="password" type="password" required></b-form-input>
        </b-form-group>

        <button type="submit" class="ih-btn-primary login-submit">Login</button>
      </b-form>
      <b-alert :model-value="!!errorMessage" variant="danger" class="mt-3">
        {{ errorMessage }}
      </b-alert>
      <router-link to="/signup">Don't have an account? Sign up here</router-link>
    </AuthPageLayout>
  </div>
</template>

<script>
import { ref, onMounted, inject } from 'vue'
import { BForm, BFormGroup, BFormInput, BButton, BTooltip } from 'bootstrap-vue-next'
import AuthPageLayout from './AuthPageLayout.vue'

export default {
  components: {
    AuthPageLayout,
    BForm,
    BFormGroup,
    BFormInput,
    BButton,
    BTooltip
  },
  setup() {
    const email = ref('')
    const password = ref('')
    const oauthProviders = ref([])
    const errorMessage = ref('')

    // Inject pocketbase
    const pocketbase = inject('pocketbase')
    const router = inject('router')
    const emitter = inject('emitter')

    onMounted(async () => {
      try {
        const result = await pocketbase.collection('users').listAuthMethods()
        oauthProviders.value.push(...result.oauth2.providers)
      } catch (err) {
        console.error('Failed to fetch auth methods:', err)
      }
    })

    const login = async () => {
      errorMessage.value = ''
      try {
        await pocketbase
          .collection('users')
          .authWithPassword(email.value, password.value, { expand: 'roles' })
        const redirect = router.currentRoute.value.query.redirect
        router.push(typeof redirect === 'string' ? redirect : '/')
      } catch (err) {
        console.error('Login failed:', err)
        errorMessage.value =
          err?.status === 400
            ? 'Incorrect email or password.'
            : 'Could not log in. Please try again.'
      }
    }

    const loginWithOAuth = async (provider) => {
      try {
        const redirectUrl = `${window.location.origin}/api/oauth2-redirect`

        const authData = await pocketbase.collection('users').authWithOAuth2({
          provider: provider,
          redirectUrl: redirectUrl,
          createData: {
            consents: {
              //   role: provisionalUserRole.id,
              emailConsent: false,
              consents: {}
            }
          }
        })

        console.log(`Logged in with ${provider}:`, authData)

        const existingMeta = authData.record.meta || {}
        await pocketbase.collection('users').update(authData.record.id, {
          meta: { ...existingMeta, [provider]: authData.meta.rawUser }
        })

        emitter.emit('toast', {
          title: 'Logged in with ' + provider,
          variant: 'success'
        })
        router.push('/')
      } catch (err) {
        console.error(`OAuth login failed for ${provider}:`, err)
      }
    }

    return {
      email,
      password,
      oauthProviders,
      errorMessage,
      login,
      loginWithOAuth
    }
  }
}
</script>

<style scoped>
a {
  color: var(--foreground);
}

.login-page {
  padding: 2rem;
}

.form-group {
  margin-bottom: 2rem;
}

.oauth-icon-btn {
  width: auto;
  padding: 0.75rem 1rem;
  margin: 0.25rem;
}

.oauth-section {
  margin-top: 1rem;
  text-align: center;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

.form-label {
  color: var(--foreground);
  font-weight: bold;
}

.login-submit {
  width: 100%;
  justify-content: center;
}
</style>
