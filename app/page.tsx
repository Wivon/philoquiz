"use client";

import { useEffect, useState } from "react";

import { Home } from "@/components/Home";
import { Multiplayer } from "@/components/Multiplayer";
import { Solo } from "@/components/Solo";
import { loadSession } from "@/lib/session";

type Mode = "home" | "host" | "join" | "solo" | "present";

export default function Page() {
  // `null` until we've checked sessionStorage (client-only) to avoid a flash.
  const [mode, setMode] = useState<Mode | null>(null);
  const [autoRestore, setAutoRestore] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setAutoRestore(true);
      setMode(session.role);
    } else {
      setMode("home");
    }
  }, []);

  const go = (m: Mode) => {
    setAutoRestore(false);
    setMode(m);
  };
  const goHome = () => go("home");

  return (
    <main className="flex min-h-dvh items-center justify-center p-4 py-10">
      {mode === "home" && (
        <Home
          onHost={() => go("host")}
          onJoin={() => go("join")}
          onSolo={() => go("solo")}
          onPresent={() => go("present")}
        />
      )}
      {(mode === "host" || mode === "join" || mode === "present") && (
        <Multiplayer mode={mode} onExit={goHome} autoRestore={autoRestore} />
      )}
      {mode === "solo" && <Solo onExit={goHome} />}
    </main>
  );
}
