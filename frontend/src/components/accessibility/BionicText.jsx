import { memo } from 'react';

/**
 * Transforms text by bolding the first half of each word.
 * Helps with reading speed for dyslexia and ADHD.
 * Only processes string children — passes through JSX unchanged.
 */
function BionicText({ children }) {
  if (typeof children !== 'string') return children;

  const parts = children.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return part;
        if (part.length <= 1) return <span key={i}>{part}</span>;
        const mid = Math.ceil(part.length / 2);
        return (
          <span key={i}>
            <span className="bionic-bold">{part.slice(0, mid)}</span>
            {part.slice(mid)}
          </span>
        );
      })}
    </>
  );
}

export default memo(BionicText);
