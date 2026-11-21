import { Mascot } from "@/components/pixel/Mascot";

/** A boxed message with the mascot, for signed-out, offline and error states. */
export function StatusMessage({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="pixel-panel flex flex-col items-start gap-4 p-6">
      <div className="flex items-center gap-4">
        <Mascot crop="head" expression="thinking" k={1} title="" />
        <h1 className="pixel-heading text-2xl">{title}</h1>
      </div>
      <p className="text-base leading-relaxed">{children}</p>
      {action}
    </div>
  );
}
