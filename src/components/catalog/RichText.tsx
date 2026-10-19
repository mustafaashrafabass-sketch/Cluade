/** Render imported plain-text descriptions: blank-line paragraphs and "• " list items. */
export function RichText({ text, lang }: { text: string; lang?: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose-product text-[0.9375rem] leading-relaxed text-ink/85" lang={lang}>
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => l.startsWith("• "))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 ? <br /> : null}
                {l}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
