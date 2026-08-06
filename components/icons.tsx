import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const Icons = {
  sun: (props: IconProps) => (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  projects: (props: IconProps) => (
    <svg {...base(props)}>
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="3" y="13" width="7" height="7" rx="1.5" />
      <rect x="14" y="13" width="7" height="7" rx="1.5" />
    </svg>
  ),
  chart: (props: IconProps) => (
    <svg {...base(props)}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15v-4M12 15V8M16 15v-6" />
    </svg>
  ),
  roof: (props: IconProps) => (
    <svg {...base(props)}>
      <path d="M3 12l9-8 9 8" />
      <path d="M5 11v9h14v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  ),
  permit: (props: IconProps) => (
    <svg {...base(props)}>
      <path d="M8 3h6l4 4v14H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v4h4M10 12h6M10 16h6" />
    </svg>
  ),
  installers: (props: IconProps) => (
    <svg {...base(props)}>
      <circle cx="12" cy="10" r="3" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
      <path d="M19 7l1.5-1.5M19 7l1.5 1.5M19 7h-2" />
    </svg>
  ),
  plus: (props: IconProps) => (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  logout: (props: IconProps) => (
    <svg {...base(props)}>
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
      <path d="M15 5h3a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3" />
    </svg>
  ),
  download: (props: IconProps) => (
    <svg {...base(props)}>
      <path d="M12 4v10" />
      <path d="M8 10l4 4 4-4" />
      <path d="M5 18h14" />
    </svg>
  ),
  spinner: (props: IconProps) => (
    <svg {...base({ ...props, className: undefined })} className={props.className}>
      <path d="M12 3a9 9 0 1 0 9 9" strokeWidth={2} />
    </svg>
  ),
  chevron: (props: IconProps) => (
    <svg {...base(props)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  menu: (props: IconProps) => (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
};
