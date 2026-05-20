import { auth, db } from './config'
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

let currentUser = null
let currentAuthStateListener = null
let authInitialized = false

const authStateListeners = []

function notifyListeners(user) {
  currentUser = user
  authInitialized = true
  authStateListeners.forEach(cb => cb(user))
}

export function onAuthChange(callback) {
  authStateListeners.push(callback)
  if (authInitialized) {
    callback(currentUser)
  }
  if (!currentAuthStateListener) {
    currentAuthStateListener = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const userData = userDoc.exists() ? userDoc.data() : {}
        notifyListeners({
          id: user.uid,
          email: user.email,
          uid: user.uid,
          full_name: userData.full_name || user.displayName || user.email,
          name: userData.full_name || user.displayName || user.email,
          role: userData.role || 'user',
          photoURL: user.photoURL,
          ...userData,
        })
      } else {
        notifyListeners(null)
      }
    })
  }
  return () => {
    const idx = authStateListeners.indexOf(callback)
    if (idx >= 0) authStateListeners.splice(idx, 1)
  }
}

export async function me() {
  if (authInitialized) return currentUser
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub()
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const userData = userDoc.exists() ? userDoc.data() : {}
        const u = {
          id: user.uid,
          email: user.email,
          uid: user.uid,
          full_name: userData.full_name || user.displayName || user.email,
          name: userData.full_name || user.displayName || user.email,
          role: userData.role || 'user',
          photoURL: user.photoURL,
          ...userData,
        }
        currentUser = u
        resolve(u)
      } else {
        currentUser = null
        resolve(null)
      }
    })
  })
}

export async function logout(redirectUrl) {
  await fbSignOut(auth)
  currentUser = null
  if (redirectUrl) {
    window.location.href = redirectUrl
  }
}

export function navigateToLogin(currentUrl) {
  const loginUrl = import.meta.env.VITE_LOGIN_URL || '/login'
  window.location.href = `${loginUrl}?redirect=${encodeURIComponent(currentUrl || window.location.href)}`
}

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data)
}

export function getCurrentTenantId() {
  return currentUser?.tenant_id || null
}

export function getCurrentUser() {
  return currentUser
}
