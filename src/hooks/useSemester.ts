import { useCallback, useEffect, useState } from "react"
import { mark, undo, type Course } from "@/lib/semester"

const KEY = "axon_semester"

/** The student's courses, persisted in this browser. */
export function useSemester() {
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]")
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(courses))
  }, [courses])

  const update = useCallback((id: string, fn: (c: Course) => Course) => setCourses((cs) => cs.map((c) => (c.id === id ? fn(c) : c))), [])

  return {
    courses,
    setCourses,
    mark: useCallback((id: string, present: boolean) => update(id, (c) => mark(c, present)), [update]),
    undo: useCallback((id: string) => update(id, undo), [update]),
    save: useCallback((course: Course) => setCourses((cs) => (cs.some((c) => c.id === course.id) ? cs.map((c) => (c.id === course.id ? course : c)) : [...cs, course])), []),
    remove: useCallback((id: string) => setCourses((cs) => cs.filter((c) => c.id !== id)), []),
  }
}
