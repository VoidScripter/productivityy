import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Check, Loader2, Plus, RefreshCw, Sparkles } from "lucide-react"
import { useAction } from "convex/react"
import { api } from "@convex/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export function HomePage() {
  const [task, setTask] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [steps, setSteps] = useState<string[]>([])
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>([false, false, false])

  const generateSteps = useAction(api.ai.generateMicroSteps);

  const handleGenerate = async () => {
    if (!task.trim()) {
      toast.error("Please enter a task you're avoiding")
      return
    }

    setIsGenerating(true)
    
    try {
      const generatedSteps = await generateSteps({ task })
      setSteps(generatedSteps)
      setCheckedSteps(new Array(generatedSteps.length).fill(false))
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

  const completedCount = checkedSteps.filter(Boolean).length
  const totalSteps = steps.length || 1
  const progress = (completedCount / totalSteps) * 100
  const isAllDone = steps.length > 0 && completedCount === steps.length

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-50 via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
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
                    Stop Procrastinating
                  </CardTitle>
                  <CardDescription className="text-lg text-slate-600 dark:text-slate-400">
                    The hardest part is starting. Let's break it down into tiny, manageable steps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="relative">
                    <Input
                      placeholder="What task are you avoiding?"
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
      </div>
    </main>
  )
}
