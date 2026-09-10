import { Fragment, type ReactNode } from "react";

/**
 * Renderiza texto do modelo com formatação básica (títulos, listas, código,
 * negrito, itálico e links) sem nunca injetar HTML — tudo vira nó React,
 * então nenhum conteúdo do prompt consegue quebrar a página.
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)|(https?:\/\/[^\s<>()]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-i${i++}`;
    if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded-[2px] bg-secondary px-1.5 py-0.5 font-mono text-[0.85em] break-all">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") || token.startsWith("_")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      nodes.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline underline-offset-2 break-all"
        >
          {token}
        </a>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function FormattedText({ text, tone }: { text: string; tone?: "error" }) {
  const blocks: ReactNode[] = [];
  const segments = text.split(/```/);

  segments.forEach((segment, index) => {
    if (index % 2 === 1) {
      const newline = segment.indexOf("\n");
      const lang = newline > -1 ? segment.slice(0, newline).trim() : "";
      const code = newline > -1 ? segment.slice(newline + 1) : segment;
      blocks.push(
        <pre
          key={`code-${index}`}
          className="my-3 max-w-full overflow-x-auto rounded-[2px] border border-border bg-surface p-3 font-mono text-[12px] leading-relaxed"
        >
          {lang ? <span className="mb-2 block text-[10px] tracking-[0.13em] text-primary">{lang.toUpperCase()}</span> : null}
          <code className="whitespace-pre">{code.replace(/\n$/, "")}</code>
        </pre>,
      );
      return;
    }

    const lines = segment.split("\n");
    let list: ReactNode[] = [];
    const flush = (key: string) => {
      if (list.length === 0) return;
      blocks.push(
        <ul key={key} className="my-2 grid list-disc gap-1 pl-5 marker:text-primary">
          {list}
        </ul>,
      );
      list = [];
    };

    lines.forEach((raw, lineIndex) => {
      const key = `b${index}-l${lineIndex}`;
      const line = raw.trimEnd();
      const bullet = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
      const heading = /^\s*(#{1,4})\s+(.*)$/.exec(line);

      if (bullet) {
        list.push(<li key={key}>{inline(bullet[1] ?? "", key)}</li>);
        return;
      }
      flush(`${key}-ul`);

      if (heading) {
        blocks.push(
          <p key={key} className="mt-4 mb-1 text-[15px] font-semibold text-foreground">
            {inline(heading[2] ?? "", key)}
          </p>,
        );
        return;
      }
      if (line.trim() === "") {
        blocks.push(<span key={key} className="block h-2" />);
        return;
      }
      blocks.push(
        <p key={key} className="my-1">
          {inline(line, key)}
        </p>,
      );
    });
    flush(`b${index}-ul-end`);
  });

  return (
    <div className={`max-w-full overflow-hidden text-sm leading-relaxed break-words ${tone === "error" ? "text-destructive" : ""}`}>
      {blocks.map((block, i) => (
        <Fragment key={i}>{block}</Fragment>
      ))}
    </div>
  );
}
