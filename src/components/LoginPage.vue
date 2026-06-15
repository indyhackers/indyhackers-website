<template>
  <div class="login-page">
    <AuthPageLayout title="Log in">
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

      <div v-if="oauthProviders.length" class="oauth-section">
        <div class="oauth-buttons">
          <template v-for="provider in oauthProviders" :key="provider.name">
            <!-- Official "Sign in with Google" button (Google brand guidelines) -->
            <button
              v-if="provider.name === 'google'"
              type="button"
              class="gsi-material-button"
              @click="loginWithOAuth('google')"
            >
              <div class="gsi-material-button-state"></div>
              <div class="gsi-material-button-content-wrapper">
                <div class="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style="display: block"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span class="gsi-material-button-contents">Sign in with Google</span>
              </div>
            </button>

            <!-- Other providers: simple icon button -->
            <div v-else>
              <b-button
                :id="'btn-' + provider.name"
                class="ih-btn-outline oauth-icon-btn"
                @click="loginWithOAuth(provider.name)"
              >
                <template v-if="provider.name === 'github'">
                  <IFaGithub />
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
                <span class="oauth-icon-btn__label">{{ provider.displayName || provider.name }}</span>
              </b-button>
              <b-tooltip :target="'btn-' + provider.name" triggers="hover">
                {{ provider.displayName }}
              </b-tooltip>
            </div>
          </template>
        </div>
      </div>

      <router-link class="signup-link" to="/signup">Don't have an account? Sign up here</router-link>
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
      errorMessage.value = ''
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

        // Best-effort: stash the provider's raw profile. Never block login on it.
        try {
          const existingMeta = authData.record.meta || {}
          await pocketbase.collection('users').update(authData.record.id, {
            meta: { ...existingMeta, [provider]: authData.meta?.rawUser }
          })
        } catch (metaErr) {
          console.warn('Could not store OAuth profile meta:', metaErr)
        }

        emitter.emit('toast', {
          title: 'Logged in with ' + provider,
          variant: 'success'
        })
        const redirect = router.currentRoute.value.query.redirect
        router.push(typeof redirect === 'string' ? redirect : '/')
      } catch (err) {
        console.error(`OAuth login failed for ${provider}:`, err)
        errorMessage.value = 'Could not log in with ' + provider + '. Please try again.'
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
  padding: 1rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  color: var(--foreground);
  font-weight: bold;
}

.login-submit {
  width: 100%;
  height: 44px;
  justify-content: center;
}

.oauth-section {
  margin-top: 1rem;
}

.oauth-buttons {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
}

/* Official Google "Sign in with Google" button (per brand guidelines). */
.gsi-material-button {
  -webkit-user-select: none;
  user-select: none;
  -webkit-appearance: none;
  background-color: #fff;
  background-image: none;
  border: 1px solid #747775;
  border-radius: 4px;
  box-sizing: border-box;
  color: #1f1f1f;
  cursor: pointer;
  font-family: 'Roboto', arial, sans-serif;
  font-size: 14px;
  height: 44px;
  letter-spacing: 0.25px;
  outline: none;
  overflow: hidden;
  padding: 0 12px;
  position: relative;
  text-align: center;
  transition:
    background-color 0.218s,
    border-color 0.218s,
    box-shadow 0.218s;
  vertical-align: middle;
  white-space: nowrap;
  width: 100%;
}

.gsi-material-button .gsi-material-button-icon {
  height: 20px;
  margin-right: 12px;
  min-width: 20px;
  width: 20px;
}

.gsi-material-button .gsi-material-button-content-wrapper {
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  height: 100%;
  justify-content: space-between;
  position: relative;
  width: 100%;
}

.gsi-material-button .gsi-material-button-contents {
  flex-grow: 1;
  font-family: 'Roboto', arial, sans-serif;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
}

.gsi-material-button .gsi-material-button-state {
  transition: opacity 0.218s;
  bottom: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.gsi-material-button:not(:disabled):hover {
  box-shadow:
    0 1px 2px 0 rgba(60, 64, 67, 0.3),
    0 1px 3px 1px rgba(60, 64, 67, 0.15);
}

.gsi-material-button:not(:disabled):hover .gsi-material-button-state {
  background-color: #303030;
  opacity: 0.08;
}

.gsi-material-button:not(:disabled):active .gsi-material-button-state,
.gsi-material-button:not(:disabled):focus .gsi-material-button-state {
  background-color: #303030;
  opacity: 0.12;
}

.oauth-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
}

.oauth-icon-btn__label {
  font-size: 0.9375rem;
}

.signup-link {
  display: block;
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9375rem;
}
</style>
