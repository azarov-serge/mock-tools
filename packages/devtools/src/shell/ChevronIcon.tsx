type ChevronIconProps = {
  open: boolean;
};

/** Clear expand/collapse caret (▸/▾ glyphs look like a dot at 11px). */
export function ChevronIcon({ open }: ChevronIconProps) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      style={{
        display: 'block',
        transform: open ? 'rotate(90deg)' : 'none',
        transition: 'transform 0.12s ease',
      }}
    >
      <path
        d="M4.25 2.5 L8.5 6 L4.25 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
