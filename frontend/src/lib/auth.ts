const AUTH_TOKEN_KEY = 'mileage.session_token'
const AUTH_LOGIN_EVENT = 'mileage-auth:login'
const AUTH_LOGOUT_EVENT = 'mileage-auth:logout'

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
}

export function hasAuthToken() {
  return Boolean(getAuthToken())
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  window.dispatchEvent(new Event(AUTH_LOGIN_EVENT))
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function logout() {
  clearAuthToken()
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT))
}

export function onAuthChange(callback: () => void) {
  window.addEventListener(AUTH_LOGIN_EVENT, callback)
  window.addEventListener(AUTH_LOGOUT_EVENT, callback)

  return () => {
    window.removeEventListener(AUTH_LOGIN_EVENT, callback)
    window.removeEventListener(AUTH_LOGOUT_EVENT, callback)
  }
}
