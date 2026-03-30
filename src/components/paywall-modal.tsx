import { useState } from "react"
import { Lock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PaywallModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCheckout: () => Promise<void>
}

export function PaywallModal({ open, onOpenChange, onCheckout }: PaywallModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleCheckout = async () => {
    setIsLoading(true)
    try {
      await onCheckout()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-none shadow-2xl rounded-3xl">
        <DialogHeader className="text-center space-y-4 pt-4">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            You've reached your daily limit!
          </DialogTitle>
          <DialogDescription className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            You've used all 4 free task breakdowns for today. Unlock unlimited lifetime access to never hit a limit again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-3 sm:flex-col pt-4">
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full h-14 text-lg rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-all shadow-lg border-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              "Buy Lifetime Access — $4.99"
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full h-12 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            I'll wait until tomorrow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
