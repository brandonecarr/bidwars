import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-game-bg p-4">
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-6xl font-black tracking-tight text-gold md:text-8xl">
          BID<span className="text-white">WARS</span>
        </h1>
        <p className="text-lg text-gray-400">The party bidding game</p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-4">
        <Link
          href="/create"
          className="group relative overflow-hidden rounded-2xl bg-game-accent px-8 py-6 text-center text-xl font-bold transition-all hover:bg-game-accent-light hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="relative z-10">
            <div className="text-2xl">Bid Admin</div>
            <div className="mt-1 text-sm font-normal text-white/70">
              Create a game session
            </div>
          </div>
        </Link>

        <Link
          href="/join"
          className="group relative overflow-hidden rounded-2xl border-2 border-gold bg-game-surface px-8 py-6 text-center text-xl font-bold text-gold transition-all hover:bg-gold hover:text-game-bg hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="relative z-10">
            <div className="text-2xl">Bid Participant</div>
            <div className="mt-1 text-sm font-normal text-current opacity-70">
              Join with a code
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
