import { useState } from "react"
import { useAuthActions } from "@convex-dev/auth/react"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function AuthForm() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signIn("password", {
        email,
        password,
        flow,
        ...(flow === "signUp" ? { name } : {}),
      })
    } catch (error) {
      const message = String(error)
      if (message.includes("InvalidAccountId") || message.includes("InvalidSecret")) {
        toast.error("Invalid email or password")
      } else if (message.includes("TooManyFailedAttempts")) {
        toast.error("Too many attempts, try again later")
      } else {
        toast.error("Authentication failed")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-50 via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 flex items-center justify-center">
      <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-2">
            <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {flow === "signIn" ? "Welcome Back" : "Start Small"}
          </CardTitle>
          <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
            {flow === "signIn" 
              ? "Continue your journey of productivity." 
              : "Create an account to break down your tasks."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {flow === "signUp" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-semibold transition-all shadow-lg mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                flow === "signIn" ? "Sign In" : "Sign Up"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-slate-600 dark:text-slate-400">
            {flow === "signIn" ? (
              <>
                Don't have an account?{" "}
                <button 
                  onClick={() => setFlow("signUp")}
                  className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button 
                  onClick={() => setFlow("signIn")}
                  className="text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}
