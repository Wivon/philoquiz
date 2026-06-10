"use client";

import { AVATARS } from "@/lib/avatars";

export const ANSWER_SHAPES = ["▲", "◆", "●", "■"];

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  type = "button",
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-violet-600 text-white hover:bg-violet-500 shadow-[0_5px_0_0_rgba(76,29,149,0.6)] active:translate-y-[3px] active:shadow-none",
    secondary:
      "bg-white text-violet-700 ring-2 ring-violet-200 hover:bg-violet-50",
    ghost: "bg-transparent text-white/80 hover:text-white underline",
    danger:
      "bg-rose-500 text-white hover:bg-rose-400 shadow-[0_5px_0_0_rgba(159,18,57,0.6)] active:translate-y-[3px] active:shadow-none",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-6 py-3 text-lg font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function AvatarPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-center text-5xl">{value}</div>
      <div className="grid max-h-44 grid-cols-7 gap-1 overflow-y-auto rounded-2xl bg-violet-50 p-2 sm:grid-cols-9">
        {AVATARS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`aspect-square rounded-xl text-2xl transition hover:scale-110 ${
              value === emoji ? "bg-violet-200 ring-2 ring-violet-500" : ""
            }`}
            aria-label={`Choisir l'avatar ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PlayerChip({
  emoji,
  name,
  highlight = false,
}: {
  emoji: string;
  name: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`pop-in flex items-center gap-2 rounded-full px-4 py-2 text-lg font-bold shadow ${
        highlight ? "bg-amber-300 text-violet-900" : "bg-white text-violet-800"
      }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="max-w-[10rem] truncate">{name}</span>
    </div>
  );
}
