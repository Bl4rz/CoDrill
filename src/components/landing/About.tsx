import { Mascot } from "@/components/pixel/Mascot";

export function About() {
  return (
    <section id="about" className="mx-auto w-full max-w-3xl scroll-mt-6 px-6 py-20">
      <h2 className="pixel-heading text-center text-3xl sm:text-4xl">About</h2>
      <div className="mt-10 flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        <div className="shrink-0">
          <Mascot expression="impressed" scale={1.5} />
        </div>
        <div className="px-dialog flex-1 p-5 sm:p-6">
          <p className="mb-3 w-fit bg-ink px-2 py-1 font-display text-xs uppercase tracking-widest text-paper">
            Bryan
          </p>
          <p className="text-lg leading-relaxed">
            I&apos;m Bryan, a high school student. I built Codrill because [TODO: Bryan fills in
            why]. It&apos;s free.
          </p>
          <p className="mt-3 text-base">
            <a
              href="https://github.com/Bl4rz/CoDrill"
              className="font-medium underline decoration-[3px] underline-offset-4 hover:bg-ink hover:text-paper"
            >
              Read the code on GitHub
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
