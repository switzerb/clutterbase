export function emailSignInEnabled() {
  return import.meta.env.VITE_EMAIL_SIGN_IN_ENABLED !== 'false'
}
