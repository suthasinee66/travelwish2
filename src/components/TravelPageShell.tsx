import type { ReactNode } from "react";
import { Compass, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function TravelPageShell({ children, eyebrow = "TravelWise" }: { children: ReactNode; eyebrow?: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-40 size-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-48 -right-32 size-[30rem] rounded-full bg-accent/15 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-16">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Compass className="size-5" /></span>
          <span className="font-heading text-xl font-bold tracking-tight text-gradient">TravelWise</span>
        </Link>
        <div className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:flex"><MapPin className="size-3.5 text-primary" /> {eyebrow}</div>
      </header>
      <div className="relative z-10">{children}</div>
    </main>
  );
}

export function TravelFormCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-2xl shadow-primary/5 backdrop-blur-xl sm:p-8 ${className}`}>{children}</div>;
}

export const travelInputClass = "w-full rounded-2xl border border-border bg-background/80 px-4 py-3.5 text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-4 focus:ring-primary/10";
export const travelLabelClass = "text-sm font-semibold text-foreground";
