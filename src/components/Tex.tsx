"use client";

import katex from "katex";
import { memo } from "react";

export const Tex = memo(function Tex({ tex, block = false, className = "" }: { tex: string; block?: boolean; className?: string }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block, output: "html" });
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
});

/** Renders text with **bold** segments. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <strong key={i} className="font-semibold text-zinc-50">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
