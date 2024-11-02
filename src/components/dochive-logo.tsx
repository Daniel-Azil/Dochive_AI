import { SVGProps } from 'react';

export function DochiveLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))' }} />
        </linearGradient>
      </defs>
      <path
        d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
        stroke="url(#logo-gradient)"
      />
      <polyline points="14 2 14 8 20 8" stroke="url(#logo-gradient)" />
      <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" />
      <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" />
    </svg>
  );
}
