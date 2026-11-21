import { Mascot } from "@/components/pixel/Mascot";

export function About() {
  return (
    <section id="about" className="mt-5 scroll-mt-6">
      <article className="pixel-panel flex flex-col gap-5 p-5 sm:p-7" aria-labelledby="t-about">
        <div className="kicker">
          <span id="t-about">About</span>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <div className="portrait">
            <Mascot crop="head" expression="impressed" k={2} title="Codrill's mascot" />
          </div>
          <p className="max-w-[40em] flex-1 text-[1.1875rem] leading-relaxed">
            I&apos;m Bryan, a high school student. I built Codrill to help people looking for jobs
            in computer science, coding and software, because the job market is rough right now.
            So why not use what&apos;s getting in the way to help us instead? It&apos;s free.
          </p>
        </div>
      </article>
    </section>
  );
}
