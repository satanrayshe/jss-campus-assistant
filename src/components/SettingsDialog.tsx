import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEFAULT_MODEL } from "@/lib/ai"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverHasKey: boolean
  keyValue: string
  modelValue: string
  onSave: (key: string, model: string) => void
}

export function SettingsDialog({ open, onOpenChange, serverHasKey, keyValue, modelValue, onSave }: Props) {
  const [key, setKey] = useState(keyValue)
  const [model, setModel] = useState(modelValue)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setKey(keyValue)
          setModel(modelValue)
        }
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave(key.trim(), model.trim())
            onOpenChange(false)
          }}
          className="grid gap-5"
        >
          <DialogHeader>
            <DialogTitle>AI settings</DialogTitle>
            <DialogDescription>
              Axon uses free OpenRouter models to write answers from the campus FAQ. Without a key it still answers, by returning the
              closest FAQ entry.
            </DialogDescription>
          </DialogHeader>

          {serverHasKey && (
            <p className="rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-muted-foreground">
              This server already has a key in <code className="font-mono text-foreground">.env</code>. Leave the field empty to use it.
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="or-key">OpenRouter API key</Label>
            <Input id="or-key" type="password" autoComplete="off" placeholder="sk-or-v1-…" value={key} onChange={(e) => setKey(e.target.value)} />
            <p className="text-xs text-muted-foreground">Saved only in this browser.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="or-model">Model</Label>
            <Input id="or-model" className="font-mono text-[13px]" placeholder={DEFAULT_MODEL} value={model} onChange={(e) => setModel(e.target.value)} />
            <p className="text-xs text-muted-foreground">Leave empty for the free chain: Nemotron 3 Super, then Nemotron 3 Ultra, then any free model.</p>
          </div>

          <DialogFooter>
            {keyValue && (
              <Button type="button" variant="ghost" className="mr-auto text-muted-foreground" onClick={() => setKey("")}>
                Clear key
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
