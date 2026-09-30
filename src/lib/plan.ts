// "My first-week plan": a personal checklist assembled from knowledge-base entries.
// Every item cites the entry it came from, so the plan is as trustworthy as the chat.

export type Stay = "hostel-girls" | "hostel-boys" | "day"
export type Programme = "btech" | "pharmacy" | "mba-mca" | "other"
export type Interest = "coding" | "cars" | "electronics" | "cultural" | "sports"

export interface Profile {
  stay: Stay
  programme: Programme
  interests: Interest[]
}

export type When = "Day 1" | "Week 1" | "This month"

export interface PlanItem {
  key: string
  when: When
  title: string
  detail: string
  source: string // FAQ id
}

export const STAY_LABEL: Record<Stay, string> = { "hostel-girls": "Girls' hostel", "hostel-boys": "Boys' hostel", day: "Day scholar" }
export const PROGRAMME_LABEL: Record<Programme, string> = { btech: "B.Tech", pharmacy: "Pharmacy", "mba-mca": "MBA / MCA", other: "Other programme" }
export const INTEREST_LABEL: Record<Interest, string> = {
  coding: "Coding",
  cars: "Cars & racing",
  electronics: "Electronics",
  cultural: "Fests & culture",
  sports: "Sports & fitness",
}

const REGS: Record<Programme, string> = {
  btech: "Read the B.Tech Regulations 2026-27, and look at the Honours and Minor Degree options while you're there.",
  pharmacy: "Read your B.Pharm, D.Pharm or M.Pharm regulations on the Academic Regulations page.",
  "mba-mca": "Read the MBA or MCA regulations on the Academic Regulations page.",
  other: "Find your programme's regulations on the Academic Regulations page.",
}

export function buildPlan({ stay, programme, interests }: Profile): PlanItem[] {
  const hostel = stay !== "day"
  const items: (PlanItem | false)[] = [
    { key: "portal", when: "Day 1", title: "Log in to the student portal", detail: "studentportal.universitysolutions.in has your attendance, marks and records.", source: "portal" },
    { key: "mentor", when: "Day 1", title: "Meet your faculty mentor", detail: "Every student is assigned one. They're your first stop for timetables, attendance and anything that goes wrong.", source: "counselling" },
    { key: "ragging", when: "Day 1", title: "Save the anti-ragging helpline", detail: "1800-180-5522, toll-free and 24x7. The university's Anti-Ragging Cell is on campus too.", source: "anti-ragging" },
    hostel && {
      key: "curfew",
      when: "Day 1",
      title: `Know your curfew: back by ${stay === "hostel-girls" ? "8:30 PM" : "10:00 PM"}`,
      detail: "It runs until 6:00 AM, and entry and exit are recorded biometrically.",
      source: "hostel-curfew",
    },
    !hostel && { key: "contact", when: "Day 1", title: "Save the university's contact numbers", detail: "0120-2401484 (direct) and admissions@jssuninoida.edu.in.", source: "contact" },

    { key: "attendance", when: "Week 1", title: "Keep every course above 75% attendance", detail: "It's counted per course. Below 75%, you can't sit that course's semester-end exam.", source: "attendance" },
    { key: "regs", when: "Week 1", title: "Skim your programme's rules", detail: REGS[programme], source: "regulations" },
    hostel && { key: "hostel-rules", when: "Week 1", title: "Know the hostel's hard rules", detail: "Alcohol, drugs, tobacco and other intoxicants are strictly prohibited.", source: "hostel-rules" },
    { key: "amenities", when: "Week 1", title: "Find the cafeteria and the ATM", detail: "The cafeteria serves veg and non-veg food. The ATM in the Amenities Centre is open round the clock.", source: "amenities" },
    { key: "health", when: "Week 1", title: "Find the Primary Health Center", detail: "It's on campus, and the Counselling Cell offers confidential support if you need it.", source: "medical" },

    interests.includes("coding") && { key: "jcsi", when: "This month", title: "Join JCSI or IEEE", detail: "JCSI is the Computer Society of India branch, under the CSI Ghaziabad Chapter.", source: "clubs" },
    interests.includes("cars") && { key: "vega", when: "This month", title: "Try out for SAE Team VEGA", detail: "They build a race car for the SUPRA competition.", source: "clubs" },
    interests.includes("electronics") && { key: "iete", when: "This month", title: "Join IETE or IEEE", detail: "IETE is the Institution of Electronics and Telecommunication Engineers.", source: "clubs" },
    interests.includes("cultural") && { key: "zealicon", when: "This month", title: "Put Zealicon on your radar", detail: "The 4-day techno-cultural fest, usually around February-March.", source: "fest" },
    interests.includes("sports") && { key: "sports", when: "This month", title: "Pick a sport", detail: "Football, cricket, basketball, badminton, table tennis and more, plus the Fitness Center.", source: "sports" },
    programme === "btech" && { key: "nptel", when: "This month", title: "Plan an NPTEL course for extra credits", detail: "Check the SWAYAM-NPTEL guidelines with your coordinator before you enrol.", source: "nptel" },
    { key: "library", when: "This month", title: "Get to know the library", detail: "1,44,052 books and group study rooms. Students say it closes around 8 PM and on Sundays.", source: "library-collection" },
  ]
  return items.filter(Boolean) as PlanItem[]
}
