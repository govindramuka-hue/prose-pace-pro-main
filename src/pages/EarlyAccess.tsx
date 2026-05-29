import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BarChart3, Bell, BookOpen, Brain, Cloud, Headphones, Library, Moon, Rows3, Sparkles, UserRoundCheck, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/lib/waitlist";

const nowFeatures = [
  { icon: Rows3, title: "Spotlight and Flow", body: "Move through one focused line or a few lines at a time." },
  { icon: Moon, title: "Reading room controls", body: "Themes, fonts, pacing, manual taps, and line settings are already in the demo." },
  { icon: BookOpen, title: "Native Lumen library", body: "Curated books already feel best here because they are cleaned, structured, and tuned for the reader." },
  { icon: UserRoundCheck, title: "Cast and context", body: "Built-in book pages can carry character information and supporting context around the text." },
  { icon: Sparkles, title: "Vocabulary support", body: "Word meanings are available inside the reading flow without sending the user elsewhere." },
  { icon: Headphones, title: "Ambient sound", body: "Optional soundscapes help the reading room feel focused and personal." },
];

const futureFeatures = [
  { icon: Wand2, title: "AI-prepared uploads", body: "The goal is to turn uploaded books into the Lumen experience: cleaner text, chapter structure, removed repeated noise, and comfortable reading units." },
  { icon: Brain, title: "Dynamic recaps", body: "A useful recap based on where the reader stopped, how long they were away, and what matters next." },
  { icon: BarChart3, title: "Reading analytics", body: "Time read, streaks, finished books, reading rhythm, and patterns that make progress visible." },
  { icon: Library, title: "Expanded native library", body: "More polished books prepared for Lumen, plus easier discovery and import of free public-domain titles." },
  { icon: Cloud, title: "Your reading account", body: "Sign in once and keep your progress, current reads, library, and preferences connected across devices." },
  { icon: Bell, title: "Story-aware reminders", body: "Thoughtful notifications for streaks, unfinished chapters, and moments that make you curious to return without spoiling the book." },
];

const readingGoals = [
  "Finish more novels",
  "Read classics",
  "Import my own EPUBs",
  "Import book PDFs",
  "Build a daily habit",
  "Use it for study reading",
];

const priorities = [
  "AI-prepared uploads",
  "Dynamic recaps",
  "Bigger native library",
  "Reading analytics",
  "Better focus modes",
  "Free book discovery",
];

export default function EarlyAccess() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [readingTypes, setReadingTypes] = useState<string[]>([]);
  const [prioritiesSelected, setPrioritiesSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "saved" | "duplicate" | "invalid" | "unavailable">("idle");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const result = await joinWaitlist({
      email,
      name: name.trim() || undefined,
      readingTypes,
      priorities: prioritiesSelected,
      source: "early-access-page",
    });
    if (!result.ok) {
      if (result.reason === "duplicate") {
        setStatus("duplicate");
        return;
      }
      if (result.reason === "unavailable") {
        setStatus("unavailable");
        return;
      }
      setStatus("invalid");
      return;
    }
    setStatus("saved");
  }

  const submitted = status === "saved" || status === "duplicate";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="w-full box-border px-6 pt-10 pb-6 max-w-6xl mx-auto flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 text-left">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center" style={{ boxShadow: "var(--shadow-glow)" }}>
            <BookOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg leading-none tracking-tight">Lumen</div>
            <div className="text-xs text-muted-foreground mt-0.5">waitlist</div>
          </div>
        </button>
        <Button variant="outline" className="rounded-full" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to demo
        </Button>
      </header>

      <main>
        <section className="w-full box-border px-6 pt-10 pb-16 max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-5 text-sm text-primary">The web demo is live. The native app is next.</div>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-balance">
              A better way to finish books.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Lumen is a guided reading app built around focus, pacing, recaps, vocabulary, and a reading room that makes long books feel easier to stay with. The next version brings this experience to a native mobile app with a reading account, a larger prepared library, and AI-prepared uploads.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#join">
                <Button className="h-12 rounded-full px-6">
                  Join the waitlist
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Button variant="outline" className="h-12 rounded-full px-6" onClick={() => navigate("/")}>
                Try the demo
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="rounded-3xl border border-border bg-card p-6 md:p-8"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="text-sm text-primary mb-5">What exists today</div>
            <div className="space-y-5">
              <h2 className="font-display text-3xl leading-tight text-balance">
                The current demo already shows the core reading experience.
              </h2>
              <div className="h-1 rounded-full tension-gradient" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                The demo is meant to answer one question: does reading feel better when the app guides the rhythm instead of simply showing a page? It gives a working glimpse of the reading room, the prepared library, and the direction for uploaded books.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The native app will take this same experience further, so your books, progress, recaps, library, and reading preferences can stay with you beyond the demo.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                If it feels useful, please share it with someone who reads books and keeps meaning to finish more of them.
              </p>
            </div>
          </motion.div>
        </section>

        <section className="w-full box-border px-6 py-14 max-w-6xl mx-auto">
          <div className="max-w-2xl mb-8">
            <p className="text-sm text-primary mb-3">In the demo</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight">What people can try now.</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {nowFeatures.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl leading-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full box-border px-6 py-14 max-w-6xl mx-auto">
          <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
            <div className="grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-sm text-primary mb-3">Why build it</p>
                <h2 className="font-display text-3xl md:text-5xl leading-tight text-balance">
                  Most reading apps show the book. Lumen is built to help people continue.
                </h2>
              </div>
              <div className="space-y-4 pt-1 text-base text-muted-foreground leading-7">
                <p>People often start books with good intentions, then lose rhythm, context, or patience. Most reading apps offer pages and settings, but very little help with returning, continuing, or rebuilding momentum.</p>
                <p>Lumen adds structure around the act of reading: pacing, context, recaps, meanings, library memory, and a calmer interface.</p>
                <p>The goal is not to replace books with summaries. The goal is to help more people stay with the books they already want to read.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full box-border px-6 py-14 max-w-6xl mx-auto">
          <div className="max-w-2xl mb-8">
            <p className="text-sm text-primary mb-3">Native app direction</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight">What comes next.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {futureFeatures.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl leading-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="join" className="w-full box-border px-6 py-16 max-w-5xl mx-auto">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/12 via-card to-card p-6 md:p-10" style={{ boxShadow: "var(--shadow-glow)" }}>
            {submitted ? (
              <div className="text-center max-w-2xl mx-auto py-8">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="font-display text-4xl leading-tight">
                  {status === "duplicate" ? "You are already on the list." : "You are on the early list."}
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  {status === "duplicate"
                    ? "This email is already registered, so we did not add it again."
                    : "Your answers help decide what gets built first while the native app is being shaped."}
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button className="rounded-full" onClick={() => navigate("/")}>Return to demo</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <p className="text-sm text-primary mb-3">Waitlist</p>
                  <h2 className="font-display text-4xl md:text-5xl leading-tight text-balance">
                    Help shape the native app.
                  </h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed">
                    Join if you want the full Lumen app on mobile. Your answers help decide what gets built first while the app is still being shaped.
                  </p>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    No spam. Your answers help decide what to build first.
                  </p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name (optional)" />
                    <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required />
                  </div>

                  <MultiChoiceGroup label="What would you use Lumen for?" value={readingTypes} onChange={setReadingTypes} options={readingGoals} />
                  <MultiChoiceGroup label="What should we build first?" value={prioritiesSelected} onChange={setPrioritiesSelected} options={priorities} />

                  {status === "invalid" && <p className="text-sm text-destructive">Please enter a valid email.</p>}
                  {status === "unavailable" && <p className="text-sm text-destructive">The waitlist database is not ready yet. Please try again after setup.</p>}
                  <Button type="submit" className="h-12 w-full rounded-full">
                    Request early access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function MultiChoiceGroup({ label, value, onChange, options }: { label: string; value: string[]; onChange: (value: string[]) => void; options: string[] }) {
  return (
    <div>
      <div className="mb-2 text-sm text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const active = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(active ? value.filter(item => item !== option) : [...value, option])}
              className={`h-9 rounded-full border px-3 text-xs transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground hover:border-primary/50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
