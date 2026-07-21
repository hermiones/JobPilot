import Link from "next/link";

const card =
  "card-surface rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-white/[0.06] backdrop-blur-md p-5 md:p-6";

export function HowToUse() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <span className="inline-block rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          the tea ☕
        </span>
        <h1 className="text-3xl font-bold tracking-tight">
          ok but why does Job Pilot exist
        </h1>
        <p className="text-black/60 dark:text-white/60 max-w-xl mx-auto">
          real talk: applying to jobs is objectively one of the most miserable
          side quests of adulthood. here&apos;s how this app makes it suck way less.
        </p>
      </div>

      <section className={card}>
        <h2 className="text-lg font-semibold mb-2">😮‍💨 the problem, unfiltered</h2>
        <p className="text-black/75 dark:text-white/75 leading-relaxed">
          You&apos;re trying to land a job. The advice is always &quot;just apply to
          50 a day!!&quot; — cool, cool, except each one needs you to (1) find the
          listing, (2) actually read the JD, (3) rewrite your resume so the bot
          doesn&apos;t insta-reject you, (4) write a cover letter that isn&apos;t
          copy-pasted, (5) fill out the same form for the 40th time, and (6)
          remember which of your 200 tabs was for which company. It&apos;s not
          that job hunting is hard, it&apos;s that it&apos;s <em>tedious</em> in a
          way that eats your whole day and gives you nothing back. That&apos;s the
          actual enemy here.
        </p>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold mb-2">✨ the fix</h2>
        <p className="text-black/75 dark:text-white/75 leading-relaxed mb-3">
          Job Pilot automates every part of that except the one part that
          actually matters — you clicking &quot;submit&quot; on the real employer site.
          No bots logging in as you, no mass-spamming companies, no ToS
          violations. Just the boring parts on autopilot (see what we did there)
          and the important part still in your hands.
        </p>
        <ul className="space-y-2 text-black/75 dark:text-white/75">
          <li>🔎 <b>Finds jobs for you</b> — pulls real listings from public company job boards, no scrolling required.</li>
          <li>🎯 <b>Ranks them by fit</b> — scores every job against your resume/roles/location so you skip the ones that were never gonna work anyway.</li>
          <li>🤖 <b>AI writes the first draft</b> — tailored resume bullets + a cover letter, generated per job, that you edit not write from scratch.</li>
          <li>📋 <b>Tracks everything</b> — no more "wait did I already apply here?" spreadsheet chaos.</li>
          <li>⏰ <b>Can run itself</b> — set it to auto-refresh a few times a day and the queue just... fills up.</li>
        </ul>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold mb-3">🚀 how to actually use this thing</h2>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">1</span>
            <div>
              <p className="font-medium">Set up your Profile</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                Drop in your resume, the roles you want, where you want to work,
                your salary floor, and any companies you never want to see again.
                This is the info everything else is built from — don&apos;t skip it.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">2</span>
            <div>
              <p className="font-medium">Add some job boards</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                Head to Profile → Job boards and hit &quot;Auto-discover&quot;, or type
                in companies you&apos;re curious about. This is where your jobs
                are gonna come from.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">3</span>
            <div>
              <p className="font-medium">Hit refresh (or let it auto-run)</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                From the Dashboard, click &quot;Refresh jobs&quot; and watch your queue
                fill up with ranked matches. Or turn on the automation schedule
                and let it happen on its own, multiple times a day, no clicking required.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">4</span>
            <div>
              <p className="font-medium">Go through the Review Queue</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                For each job: skim the JD, hit &quot;Generate with AI&quot; for a
                tailored resume + cover letter, tweak whatever feels off, then
                &quot;Approve &amp; Open&quot; — that logs it as applied and pops open the
                real application page for you to finish.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 h-7 w-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">5</span>
            <div>
              <p className="font-medium">Track it all in the Tracker</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                Update statuses as responses come in, get nudged to follow up
                after a week of silence, and export the whole log as a CSV
                whenever you want the receipts.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold mb-2">🙅 what this is NOT</h2>
        <p className="text-black/75 dark:text-white/75 leading-relaxed">
          It&apos;s not a bot that logs into LinkedIn as you. It&apos;s not going
          to auto-submit 500 identical applications while you sleep. It&apos;s not
          magic that guarantees an offer. It&apos;s just... a genuinely good
          assistant that clears out the busywork so you can spend your energy on
          the parts that actually need a human — deciding if a job is worth it,
          and making your case for why you&apos;re the one.
        </p>
      </section>

      <div className="text-center pt-2">
        <Link
          href="/"
          className="inline-block rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          ok let&apos;s go →
        </Link>
      </div>
    </div>
  );
}
