import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Check, Loader2, Plus, RefreshCw, Sparkles, LogOut, History, ArrowUpDown } from "lucide-react"
import { useAction, useQuery, useMutation, useConvexAuth } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "@convex/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { AuthForm } from "@/components/auth-form"
import { PaywallModal } from "@/components/paywall-modal"
import { SignupWallModal } from "@/components/signup-wall-modal"

const MOTIVATIONAL_QUOTES = [
  "The secret of getting ahead is getting started. — Mark Twain",
  "A year from now you'll wish you had started today. — Karen Lamb",
  "Small steps every day lead to big changes over time.",
  "You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
  "Progress, not perfection, is what we should be asking of ourselves.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Done is better than perfect.",
  "It always seems impossible until it's done. — Nelson Mandela",
]

export function HomePage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signOut } = useAuthActions()

  const [task, setTask] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [steps, setSteps] = useState<string[]>([])
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>([])
  const [showPaywall, setShowPaywall] = useState(false)
  const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)])
  const [showHistory, setShowHistory] = useState(false)
  const [historySort, setHistorySort] = useState<"latest" | "oldest">("latest")

  // New state variables
  const [guestUsed, setGuestUsed] = useState(() => localStorage.getItem("microsteps_guest_used") === "true")
  const [showSignupWall, setShowSignupWall] = useState(false)
  const [showAuthForm, setShowAuthForm] = useState(false)

  const usage = useQuery(api.usage.getUsage)
  const incrementUsage = useMutation(api.usage.incrementUsage)
  const generateSteps = useAction(api.ai.generateMicroSteps);
  const saveTask = useMutation(api.tasks.saveTask)
  const history = useQuery(api.tasks.getHistory, { sort: historySort })

  const createCheckout = useAction(api.pay.createCheckout)
  const checkAccess = useAction(api.pay.check)
  const listProducts = useAction(api.pay.listProducts)
  const upgradeToPremium = useMutation(api.usage.upgradeToPremium)

  // Reusable function to check payment access
  const checkPaymentAccess = useCallback(() => {
    if (!isAuthenticated) return
    if (usage?.isPremium) return
    if (usage === undefined) return

    checkAccess({ productSlug: "lifetime-access" })
      .then((result) => {
        if (result.data?.allowed) {
          upgradeToPremium().catch(() => {})
          toast.success("Welcome to unlimited access! 🎉")
        }
      })
      .catch(() => {})
  }, [isAuthenticated, usage?.isPremium, usage, checkAccess, upgradeToPremium])

  // Check payment on mount + when user returns to tab (after checkout in another tab)
  useEffect(() => {
    checkPaymentAccess()

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkPaymentAccess()
      }
    }

    const handleFocus = () => {
      checkPaymentAccess()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [checkPaymentAccess])

  const handleGenerate = async () => {
    if (!task.trim()) {
      toast.error("Please enter a task you're avoiding")
      return
    }

    // GUEST flow
    if (!isAuthenticated) {
      if (guestUsed) {
        setShowSignupWall(true)
        return
      }

      setIsGenerating(true)
      try {
        const generatedSteps = await generateSteps({ task })
        setSteps(generatedSteps)
        setCheckedSteps(new Array(generatedSteps.length).fill(false))
        // Mark guest as having used their free try
        localStorage.setItem("microsteps_guest_used", "true")
        setGuestUsed(true)
        toast.success("Micro-steps generated!")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong")
      } finally {
        setIsGenerating(false)
      }
      return
    }

    // AUTHENTICATED flow (existing logic — unchanged)
    try {
      const allowed = await incrementUsage()
      if (!allowed) {
        setShowPaywall(true)
        return
      }
    } catch (error) {
      toast.error("Something went wrong checking your usage")
      return
    }

    setIsGenerating(true)
    try {
      const generatedSteps = await generateSteps({ task })
      setSteps(generatedSteps)
      setCheckedSteps(new Array(generatedSteps.length).fill(false))
      saveTask({ task, steps: generatedSteps }).catch(() => {})
      toast.success("Micro-steps generated!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleStep = (index: number) => {
    const newChecked = [...checkedSteps]
    newChecked[index] = !newChecked[index]
    setCheckedSteps(newChecked)
    
    if (newChecked[index]) {
      toast.success("Step completed!", {
        description: "Great job keeping the momentum!",
        duration: 2000,
      })
    }
  }

  const reset = () => {
    setTask("")
    setSteps([])
    setCheckedSteps([])
  }

  const handleCheckout = useCallback(async () => {
    try {
      // Fetch products to get the real priceId
      const productsResult = await listProducts({})
      if (productsResult.error) {
        toast.error("Could not load products. Please try again.")
        return
      }
      
      const lifetimeProduct = productsResult.data?.find(
        (p: any) => p.product.slug === "lifetime-access"
      )
      if (!lifetimeProduct || !lifetimeProduct.prices?.[0]) {
        toast.error("Product not found. Please try again.")
        return
      }

      const priceId = lifetimeProduct.prices[0].id

      const { data, error } = await createCheckout({
        productSlug: "lifetime-access",
        priceId,
        successUrl: window.location.origin,
      })

      if (error) {
        toast.error(error.message || "Checkout failed")
        return
      }
      if (!data?.purchaseUrl) {
        toast.error("Checkout failed. Please try again.")
        return
      }

      // Open in new tab (required for iframe context)
      window.open(data.purchaseUrl, "_blank", "noopener,noreferrer")
      
      // Close the paywall modal
      setShowPaywall(false)
      toast.success("Checkout opened in a new tab!")
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
    }
  }, [createCheckout, listProducts])

  const completedCount = checkedSteps.filter(Boolean).length
  const totalSteps = steps.length || 1
  const progress = (completedCount / totalSteps) * 100
  const isAllDone = steps.length > 0 && completedCount === steps.length

  // Auth loading — keep as-is
  if (authLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-50 via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </main>
    )
  }

  // Show auth form when user chose to sign up from the signup wall
  if (showAuthForm && !isAuthenticated) {
    return <AuthForm />
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-50 via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 flex items-center justify-center">
      
      {/* Top-right: Sign out (authenticated) or Sign in (guest) */}
      <div className="fixed top-4 right-4 z-50">
        {isAuthenticated ? (
          <Button variant="ghost" size="sm" onClick={() => signOut()} className="rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50">
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setShowAuthForm(true)} className="rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 text-amber-700 dark:text-amber-400">
            Sign in
          </Button>
        )}
      </div>

      <div className="w-full max-w-2xl">
        {/* Usage badge — only for authenticated users */}
        {isAuthenticated && usage && !usage.isPremium && (
          <div className="text-center mb-4">
            <Badge variant="secondary" className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-amber-200 dark:border-amber-900/30 text-amber-700 dark:text-amber-400">
              {usage.remaining}/{usage.limit} free tasks remaining today
            </Badge>
          </div>
        )}
        {isAuthenticated && usage?.isPremium && (
          <div className="text-center mb-4">
            <Badge className="bg-amber-500 text-slate-950 hover:bg-amber-600">Unlimited ✨</Badge>
          </div>
        )}
        
        {/* Guest badge — show for unauthenticated users */}
        {!isAuthenticated && (
          <div className="text-center mb-4">
            <Badge variant="secondary" className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              {guestUsed ? "0/1 free try remaining" : "1 free try — no sign-up needed!"}
            </Badge>
          </div>
        )}

        <AnimatePresence mode="wait">
          {steps.length === 0 ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
                <CardHeader className="text-center space-y-2">
                  <div className="mx-auto w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-2">
                    <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                    {isAuthenticated ? "Stop Procrastinating" : "Boost Your Productivity & Stop Procrastinating"}
                  </CardTitle>
                  <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
                    {isAuthenticated 
                      ? "The hardest part is starting. Let's break it down into tiny, manageable steps."
                      : "Our AI breaks overwhelming tasks into 3 tiny micro-steps you can do in under 2 minutes each. Try it free — no sign-up required."}
                  </CardDescription>
                  <p className="text-sm text-amber-600/70 dark:text-amber-400/70 italic mt-2">
                    "{quote}"
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="relative">
                    <Input
                      placeholder="Clean up bed, Study for a test..."
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      className="h-14 text-lg pl-4 pr-12 rounded-2xl border-slate-200 dark:border-slate-800 focus-visible:ring-amber-500"
                      onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Plus className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleGenerate} 
                    disabled={isGenerating}
                    className="w-full h-14 text-lg rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-semibold transition-all shadow-lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Thinking...
                      </>
                    ) : (
                      "Get Micro-Steps"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="steps"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <Card className="border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl overflow-hidden">
                <div className="h-2 bg-slate-100 dark:bg-slate-800 w-full">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                  />
                </div>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Your Tiny Roadmap
                      </CardTitle>
                      <CardDescription className="text-slate-500 font-medium italic">
                        "{task}"
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="px-3 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                      {completedCount} of {steps.length} done
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {steps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => toggleStep(index)}
                      className={cn(
                        "group relative flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                        checkedSteps[index] 
                          ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30" 
                          : "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/50"
                      )}
                    >
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                        {checkedSteps[index] ? (
                          <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="text-lg font-bold text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className={cn(
                          "text-lg font-medium leading-tight transition-all duration-300",
                          checkedSteps[index] ? "text-slate-400 line-through decoration-emerald-500/50" : "text-slate-700 dark:text-slate-200"
                        )}>
                          {step}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            &lt; 2 min
                          </Badge>
                        </div>
                      </div>
                      <Checkbox 
                        checked={checkedSteps[index]} 
                        onCheckedChange={() => toggleStep(index)}
                        className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                    </motion.div>
                  ))}
                </CardContent>
                <CardFooter className="flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-900/50 p-6">
                  {isAllDone ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center w-full space-y-3"
                    >
                      <div className="text-3xl">🎉</div>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        You did it! You're no longer stuck!
                      </p>
                      <p className="text-sm text-slate-500">
                        The momentum is with you now. Keep going or take a well-deserved break.
                      </p>
                    </motion.div>
                  ) : (
                    <div className="w-full">
                      <Progress value={progress} className="h-1 mb-2" />
                      <p className="text-sm text-center text-slate-500 italic">
                        "A journey of a thousand miles begins with a single step."
                      </p>
                    </div>
                  )}
                  <Button 
                    variant="ghost" 
                    onClick={reset}
                    className="w-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start fresh with a new task
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History section — only for authenticated users */}
        {isAuthenticated && (
          <>
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => setShowHistory(!showHistory)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <History className="h-4 w-4 mr-2" />
                {showHistory ? "Hide Past Tasks" : "My Past Tasks"}
              </Button>
            </div>

            {showHistory && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-3"
              >
                {/* Sort controls */}
                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {history?.length ?? 0} past {history?.length === 1 ? "task" : "tasks"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistorySort(historySort === "latest" ? "oldest" : "latest")}
                    className="rounded-xl text-xs border-slate-200 dark:border-slate-800"
                  >
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    {historySort === "latest" ? "Latest first" : "Oldest first"}
                  </Button>
                </div>

                {/* History items */}
                {!history ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
                  </div>
                ) : history.length === 0 ? (
                  <Card className="border-none bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <CardContent className="py-8 text-center text-slate-500">
                      No tasks yet. Generate your first micro-steps above!
                    </CardContent>
                  </Card>
                ) : (
                  history.map((item) => (
                    <Card key={item._id} className="border-none bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-md">
                      <CardHeader className="pb-2 pt-4 px-5">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base font-semibold text-slate-700 dark:text-slate-200">
                            {item.task}
                          </CardTitle>
                          <span className="text-xs text-slate-400 whitespace-nowrap ml-3">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-4 px-5">
                        <ol className="space-y-1.5">
                          {item.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  ))
                )}
              </motion.div>
            )}
          </>
        )}

        {/* Guest prompt to sign up — show below steps for guests who used their free try */}
        {!isAuthenticated && steps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-center"
          >
            <Card className="border-none bg-emerald-50/80 dark:bg-emerald-900/20 backdrop-blur-sm shadow-md">
              <CardContent className="py-5">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Like what you see? Sign up to get <strong>4 free breakdowns daily</strong> + save your history.
                </p>
                <Button
                  onClick={() => setShowAuthForm(true)}
                  size="sm"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Create Free Account
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <SignupWallModal 
        open={showSignupWall} 
        onOpenChange={setShowSignupWall} 
        onSignUp={() => {
          setShowSignupWall(false)
          setShowAuthForm(true)
        }} 
      />
      {isAuthenticated && (
        <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} onCheckout={handleCheckout} />
      )}
    </main>
  )
}
