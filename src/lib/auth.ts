import { api } from "@/lib/api"

// Who is using Axon. Students identify themselves (no password: their data never leaves
// this browser). Faculty sign in against server.js with FACULTY_PASSCODE and get a signed token.

export type Session =
  | { role: "student"; name: string; roll?: string }
  | { role: "faculty" | "senior"; name: string; dept: string; token: string }

const KEY = "axon_session"

export function loadSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null")
    if ((s?.role === "faculty" || s?.role === "senior") && tokenExpired(s.token)) return null
    return s
  } catch {
    return null
  }
}

export const saveSession = (s: Session) => sessionStorage.setItem(KEY, JSON.stringify(s)) // per tab: a student tab and a faculty tab can sit side by side
export const clearSession = () => sessionStorage.removeItem(KEY)

function tokenExpired(token: string) {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")))
    return !exp || exp < Date.now()
  } catch {
    return true
  }
}

export async function passcodeLogin(role: "faculty" | "senior", name: string, dept: string, passcode: string): Promise<Session> {
  const j = await api<{ name: string; dept: string; token: string }>("POST", "api/login", { role, name, dept, passcode })
  return { role, name: j.name, dept: j.dept, token: j.token }
}

export function firstName(s: Session) {
  const words = s.name.replace(/^(dr|prof|mr|ms|mrs)\.?\s+/i, "").split(/\s+/).filter(Boolean)
  // "Dr. R. K. Verma" reads better as "Verma" than "R."
  return (words[0]?.replace(/\./g, "").length ?? 0) <= 2 ? (words.at(-1) ?? s.name) : words[0]
}
