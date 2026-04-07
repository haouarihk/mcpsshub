"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className={`px-3 py-1.5 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors ${className}`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
