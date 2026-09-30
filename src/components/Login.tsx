import gsap from "gsap"
import { useLayoutEffect, useRef, useState } from "react"
import IconStudent from "~icons/solar/square-academic-cap-linear"
import IconFaculty from "~icons/solar/case-round-linear"
import IconLock from "~icons/solar/lock-keyhole-linear"
import IconSenior from "~icons/solar/users-group-rounded-linear"
import { AxonMark } from "@/components/AxonMark"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { passcodeLogin, type Session } from "@/lib/auth"

interface Props {
  onSignIn: (s: Session) => void
  /** Faculty and senior sign-in need server.js with their passcodes set. */
  facultyAvailable: boolean
  seniorAvailable: boolean
}

function PasscodeForm({ role, onSignIn }: { role: "faculty" | "senior"; onSignIn: (s: Session) => void }) {
  const [name, setName] = useState("")
  const [dept, setDept] = useState("")
  const [passcode, setPasscode] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const senior = role === "senior"
  return (
    <form
      className="mt-5 grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError("")
        try {
          onSignIn(await passcodeLogin(role, name.trim(), dept.trim(), passcode))
        } catch (err) {
          setError((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      {senior && <p className="-mt-1 text-[13px] leading-relaxed text-muted-foreground">Seniors and alumni: share what you wish you'd known as a fresher.</p>}
      <div className="grid gap-2">
        <Label htmlFor={`${role}-name`}>Name</Label>
        <Input id={`${role}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder={senior ? "Rahul Mehta" : "Dr. R. K. Verma"} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${role}-dept`}>{senior ? "Branch and batch" : "Department or office"}</Label>
        <Input id={`${role}-dept`} value={dept} onChange={(e) => setDept(e.target.value)} placeholder={senior ? "CSE '25" : "Student Welfare"} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${role}-pass`}>{senior ? "Senior passcode" : "Faculty passcode"}</Label>
        <Input id={`${role}-pass`} type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="current-password" aria-invalid={Boolean(error)} required />
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="mt-1 h-10" disabled={busy || !name.trim() || !passcode}>
        <IconLock /> {busy ? "Signing in…" : senior ? "Sign in to the senior desk" : "Sign in to the faculty desk"}
      </Button>
    </form>
  )
}

function ServerNote({ env }: { env: string }) {
  return (
    <p className="mt-5 rounded-lg border border-border bg-muted px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
      This sign-in runs on the campus server. Start Axon with <code className="font-mono text-foreground">npm start</code> and set{" "}
      <code className="font-mono text-foreground">{env}</code> in <code className="font-mono text-foreground">.env</code>.
    </p>
  )
}

export function Login({ onSignIn, facultyAvailable, seniorAvailable }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [name, setName] = useState("")
  const [roll, setRoll] = useState("")

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = gsap.utils.selector(root)
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(q("[data-line]"), { yPercent: 110, duration: 0.8, stagger: 0.08 })
        .from(q("[data-fade]"), { autoAlpha: 0, y: 10, duration: 0.5, stagger: 0.06 }, "-=0.4")
    })
    return () => mm.revert()
  }, [])


  return (
    <div ref={root} className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col justify-between bg-primary px-6 py-8 text-primary-foreground md:px-12 md:py-12">
        <div className="flex items-center gap-2.5">
          <AxonMark className="bg-primary-foreground text-saffron" />
          <span className="font-semibold tracking-tight">Axon</span>
          <span className="text-sm text-primary-foreground/60">· JSS University Noida</span>
        </div>
        <div className="py-12 md:py-0">
          <h1 className="font-display text-[clamp(2.3rem,4.2vw,4rem)] leading-[1.02] font-[450] tracking-[-0.02em]">
            <span className="sr-only">The campus assistant that knows JSS, and knows you.</span>
            <span aria-hidden className="block overflow-hidden pb-[0.06em]">
              <span data-line className="block">
                The campus assistant
              </span>
            </span>
            <span aria-hidden className="block overflow-hidden pb-[0.06em]">
              <span data-line className="block">
                that knows JSS,
              </span>
            </span>
            <span aria-hidden className="block overflow-hidden pb-[0.08em]">
              <span data-line className="block text-saffron italic">
                and knows you.
              </span>
            </span>
          </h1>
          <p data-fade className="mt-6 max-w-md text-[15px] leading-relaxed text-primary-foreground/70">
            Students get answers from the university's guidelines, their own timetable and attendance, and tips from seniors. Faculty
            close the gaps Axon couldn't answer.
          </p>
        </div>
        <p data-fade className="hidden text-xs text-primary-foreground/50 md:block">
          Answers sourced from jssuninoida.edu.in and JSS faculty.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-10 md:px-12">
        <div data-fade className="w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose how you're using Axon.</p>

          <Tabs defaultValue="student" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="student" className="gap-1.5">
                <IconStudent /> Student
              </TabsTrigger>
              <TabsTrigger value="senior" className="gap-1.5">
                <IconSenior /> Senior
              </TabsTrigger>
              <TabsTrigger value="faculty" className="gap-1.5">
                <IconFaculty /> Faculty
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student">
              <form
                className="mt-5 grid gap-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  onSignIn({ role: "student", name: name.trim(), roll: roll.trim() || undefined })
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="s-name">Your name</Label>
                  <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aanya Sharma" autoComplete="name" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="s-roll">
                    Roll number <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input id="s-roll" value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="2600910100001" className="font-mono" />
                </div>
                <Button type="submit" size="lg" className="mt-1 h-10" disabled={!name.trim()}>
                  Continue as student
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No password needed. Your timetable and attendance stay on this device.{" "}
                  <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => onSignIn({ role: "student", name: "" })}>
                    Continue as guest
                  </button>
                </p>
              </form>
            </TabsContent>

            <TabsContent value="senior">{seniorAvailable ? <PasscodeForm role="senior" onSignIn={onSignIn} /> : <ServerNote env="SENIOR_PASSCODE" />}</TabsContent>
            <TabsContent value="faculty">{facultyAvailable ? <PasscodeForm role="faculty" onSignIn={onSignIn} /> : <ServerNote env="FACULTY_PASSCODE" />}</TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  )
}
