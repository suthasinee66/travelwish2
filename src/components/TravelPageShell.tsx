import { Link } from "@tanstack/react-router";
import { Compass, MapPin, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface TravelPageShellProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
}

export default function TravelPageShell({ eyebrow, title, description, children }: TravelPageShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-28 size-96 rounded-full bg-[var(--aurora-pink)]/45 blur-3xl" />
        <div className="absolute right-[-10rem] top-1/3 size-[30rem] rounded-full bg-[var(--aurora-blue)]/45 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-1/3 size-[28rem] rounded-full bg-[var(--aurora-lavender)]/35 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-[var(--aurora-ink)]">
          <span className="grid size-9 place-items-center rounded-2xl bg-[var(--aurora-ink)] text-white shadow-lg">
            <Compass className="size-5" />
          </span>
          TravelWise
        </Link>
        <div className="hidden items-center gap-2 text-sm text-[var(--aurora-muted)] sm:flex">
          <MapPin className="size-4 text-[var(--aurora-pink)]" />
          Your next story starts here
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 py-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
        <section className="max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-sm font-semibold text-[var(--aurora-secondary)] shadow-sm backdrop-blur">
            <Sparkles className="size-4 text-[var(--aurora-pink)]" />
            {eyebrow}
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[var(--aurora-ink)] sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[var(--aurora-secondary)] sm:text-lg">{description}</p>
        </section>
        <section className="w-full">{children}</section>
      </div>
    </main>
  );
}

export const formCardClass = "rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-[var(--aurora-shadow)] backdrop-blur-xl sm:p-8";
export const inputClass = "h-12 rounded-2xl border-white/80 bg-white/70 px-4 text-[var(--aurora-ink)] placeholder:text-[var(--aurora-muted)] focus-visible:ring-[var(--aurora-blue)]";
export const primaryButtonClass = "h-12 rounded-2xl bg-[var(--aurora-ink)] text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-[var(--aurora-secondary)]";
export const optionClass = "rounded-2xl border border-white/80 bg-white/60 px-4 py-3 text-left text-sm font-medium text-[var(--aurora-secondary)] transition hover:-translate-y-0.5 hover:bg-white";
export const activeOptionClass = "border-[var(--aurora-pink)] bg-[var(--aurora-pink)]/20 text-[var(--aurora-ink)] ring-2 ring-[var(--aurora-pink)]/30";
