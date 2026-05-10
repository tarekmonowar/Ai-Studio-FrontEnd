import { Mail } from "lucide-react";
import Image from "next/image";
import tmProfile from "@/public/tm.png";
import { formatRemainingDuration } from "./voicePanel.constants";

interface VoiceSessionStatsProps {
  interviewPhaseLabel: string;
  remainingSeconds: number | null;
  started: boolean;
  remainingTimeTextClass: string;
  assistantQuestionCount: number;
  userResponseCount: number;
}

export function VoiceSessionStats({
  interviewPhaseLabel,
  remainingSeconds,
  started,
  remainingTimeTextClass,
  assistantQuestionCount,
  userResponseCount,
}: VoiceSessionStatsProps) {
  return (
    <section className="rounded-xl border border-cyan-400/20 bg-slate-900/60 p-2 backdrop-blur sm:p-3">
      {/* ─── Stat Cards ───────────────────────────────────────────────── */}
      <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
        <div className="rounded-lg sm:rounded-xl bg-slate-950/70 py-2 px-2.5 sm:px-3">
          <p className="text-[10px] sm:text-xs text-slate-400">Phase</p>
          <p className="mt-0.5 sm:mt-1 font-semibold text-sm sm:text-base xl:text-lg text-cyan-400">
            {interviewPhaseLabel}
          </p>
        </div>

        <div className="rounded-lg sm:rounded-xl bg-slate-950/70 py-2 px-2.5 sm:px-3">
          <p className="text-[10px] sm:text-xs text-slate-400">
            Time remaining
          </p>
          <p className={remainingTimeTextClass}>
            {formatRemainingDuration(remainingSeconds, started)}
          </p>
        </div>

        <div className="rounded-lg sm:rounded-xl bg-slate-950/70 py-2 px-2.5 sm:px-3">
          <p className="text-[10px] sm:text-xs text-slate-400">
            Questions asked
          </p>
          <p className="mt-0.5 sm:mt-1 font-semibold text-cyan-100 text-sm sm:text-base xl:text-lg">
            {assistantQuestionCount}
          </p>
        </div>

        <div className="rounded-lg sm:rounded-xl bg-slate-950/70 py-2 px-2.5 sm:px-3">
          <p className="text-[10px] sm:text-xs text-slate-400">
            Your responses
          </p>
          <p className="mt-0.5 sm:mt-1 font-semibold text-emerald-100 text-sm sm:text-base xl:text-lg">
            {userResponseCount}
          </p>
        </div>
      </div>

      {/* ─── Developer Profile Card ───────────────────────────────────── */}
      <div className="mt-2 sm:mt-3 rounded-lg sm:rounded-xl border border-cyan-400/20 bg-slate-900/65 p-2.5 sm:p-3">
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] text-slate-300">
          Developer
        </p>
        <div className="mt-2 flex items-center gap-3 sm:gap-6 rounded-lg sm:rounded-xl border border-cyan-400/20 bg-slate-950/70 p-2 sm:p-2 sm:pl-6">
          <Image
            src={tmProfile}
            alt="Tarek Monowar"
            width={72}
            height={72}
            className="h-[52px] w-[52px] sm:h-[72px] sm:w-[72px] shrink-0 rounded-full border border-cyan-400/40 object-cover"
            priority={false}
          />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs sm:text-sm font-semibold text-slate-100">
              Tarek Monowar
            </p>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-300">
              Full Stack developer
            </p>

            {/* Social links */}
            <div className="mt-1.5 sm:mt-2 flex items-center justify-start gap-2 sm:gap-3">
              <a
                href="https://www.linkedin.com/in/tarekmonowar/"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/80 text-cyan-200 transition hover:border-cyan-300/70 hover:text-cyan-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 sm:h-5 sm:w-5 fill-current"
                >
                  <path d="M4.98 3.5C4.98 2.67 5.65 2 6.48 2h11.04c.83 0 1.5.67 1.5 1.5v17c0 .83-.67 1.5-1.5 1.5H6.48c-.83 0-1.5-.67-1.5-1.5v-17Zm4.26 15.5v-9H6.26v9h2.98Zm-1.5-10.24c.95 0 1.54-.63 1.54-1.42-.02-.81-.6-1.42-1.53-1.42-.92 0-1.53.61-1.53 1.42 0 .79.59 1.42 1.5 1.42h.02ZM17.74 19v-4.97c0-2.66-1.42-3.9-3.31-3.9-1.53 0-2.21.84-2.59 1.43v-1.22H8.86c.04.81 0 8.66 0 8.66h2.98v-4.84c0-.26.02-.52.1-.7.21-.52.69-1.06 1.5-1.06 1.06 0 1.49.8 1.49 1.98V19h2.81Z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/tarekmonowar53"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/80 text-cyan-200 transition hover:border-cyan-300/70 hover:text-cyan-100"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 sm:h-5 sm:w-5 fill-current"
                >
                  <path d="M22 12.07C22 6.5 17.52 2 12 2S2 6.5 2 12.07C2 17.1 5.66 21.27 10.44 22v-7.04H7.9V12.1h2.54V9.93c0-2.52 1.49-3.92 3.78-3.92 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.86h2.78l-.44 2.86h-2.34V22C18.34 21.27 22 17.1 22 12.07Z" />
                </svg>
              </a>
              <a
                href="mailto:tarekmonowar353@gmail.com"
                aria-label="Email"
                className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/80 text-cyan-200 transition hover:border-cyan-300/70 hover:text-cyan-100"
              >
                <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
