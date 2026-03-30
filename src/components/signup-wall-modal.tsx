import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SignupWallModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSignUp: () => void
}

export function SignupWallModal({ open, onOpenChange, onSignUp }: SignupWallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-none shadow-2xl rounded-3xl">
        <DialogHeader className="text-center space-y-4 pt-4">
          <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            You're on a roll! 🚀
          </DialogTitle>
          <DialogDescription className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Create a free account to save your history and get 4 free micro-step breakdowns every day!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-3 sm:flex-col pt-4">
          <Button
            onClick={onSignUp}
            className="w-full h-14 text-lg rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-lg border-none"
          >
            Create Free Account
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full h-12 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Maybe later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
