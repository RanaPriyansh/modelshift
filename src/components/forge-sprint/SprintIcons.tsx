import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconFrame({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M5 12h14M14 7l5 5-5 5" /></IconFrame>;
}

export function SparkIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m12 3 1.4 4.3L18 9l-4.6 1.7L12 15l-1.4-4.3L6 9l4.6-1.7L12 3Z" /><path d="m18.5 15 .7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" /></IconFrame>;
}

export function CompassIcon(props: IconProps) {
  return <IconFrame {...props}><circle cx="12" cy="12" r="8.5" /><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" /></IconFrame>;
}

export function BuildIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M4 20h16M6.5 17V8.5L12 4l5.5 4.5V17" /><path d="M9.5 17v-4h5v4" /></IconFrame>;
}

export function ProofIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M6 3.5h9l3 3V21H6z" /><path d="M15 3.5V7h3M9 12l2 2 4-4M9 18h6" /></IconFrame>;
}

export function LocalIcon(props: IconProps) {
  return <IconFrame {...props}><rect x="4" y="5" width="16" height="12" rx="2" /><path d="M8 21h8M12 17v4M8 9h8" /></IconFrame>;
}

export function CheckIcon(props: IconProps) {
  return <IconFrame {...props}><path d="m5 12 4 4L19 6" /></IconFrame>;
}

export function LinkIcon(props: IconProps) {
  return <IconFrame {...props}><path d="M10 13a5 5 0 0 0 7.1.1l1.8-1.8a5 5 0 0 0-7.1-7.1L10.7 5.3" /><path d="M14 11a5 5 0 0 0-7.1-.1l-1.8 1.8a5 5 0 0 0 7.1 7.1l1.1-1.1" /></IconFrame>;
}
