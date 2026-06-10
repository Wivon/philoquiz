"use client";

import { useState } from "react";

import { Home } from "@/components/Home";
import { Multiplayer } from "@/components/Multiplayer";
import { Solo } from "@/components/Solo";

type Mode = "home" | "host" | "join" | "solo";

export default function Page() {
  const [mode, setMode] = useState<Mode>("home");
  const goHome = () => setMode("home");

  return (
    <main className="flex min-h-dvh items-center justify-center p-4 py-10">
      {mode === "home" && (
        <Home
          onHost={() => setMode("host")}
          onJoin={() => setMode("join")}
          onSolo={() => setMode("solo")}
        />
      )}
      {(mode === "host" || mode === "join") && (
        <Multiplayer mode={mode} onExit={goHome} />
      )}
      {mode === "solo" && <Solo onExit={goHome} />}
    </main>
  );
}
