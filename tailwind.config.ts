import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * One scale, dark-first, single theme. Every colour a component uses is a semantic
 * token defined here -- raw hex at a call site is a bug. Risk roles in particular
 * (`risk-high` / `risk-med` / `risk-low` / `risk-none`) mean the same thing on every
 * page because they resolve to the same token on every page.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        // Flat key, not nested under `border`: a nested colour there collides with
        // Tailwind's border-width namespace and `border-border-strong` never resolves.
        'border-strong': 'hsl(var(--border-strong))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          raised: 'hsl(var(--surface-raised))',
          sunken: 'hsl(var(--surface-sunken))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Semantic risk roles. Never call a raw red/amber/gray at a component.
        risk: {
          high: 'hsl(var(--risk-high))',
          'high-bg': 'hsl(var(--risk-high-bg))',
          med: 'hsl(var(--risk-med))',
          'med-bg': 'hsl(var(--risk-med-bg))',
          low: 'hsl(var(--risk-low))',
          'low-bg': 'hsl(var(--risk-low-bg))',
          none: 'hsl(var(--risk-none))',
          'none-bg': 'hsl(var(--risk-none-bg))',
        },
        // Job / run lifecycle states.
        state: {
          pending: 'hsl(var(--state-pending))',
          running: 'hsl(var(--state-running))',
          succeeded: 'hsl(var(--state-succeeded))',
          failed: 'hsl(var(--state-failed))',
          cancelled: 'hsl(var(--state-cancelled))',
        },
        ai: {
          DEFAULT: 'hsl(var(--ai))',
          bg: 'hsl(var(--ai-bg))',
        },
        // Deterministic categorical ramp for chart series and graph communities.
        series: {
          1: 'hsl(var(--series-1))',
          2: 'hsl(var(--series-2))',
          3: 'hsl(var(--series-3))',
          4: 'hsl(var(--series-4))',
          5: 'hsl(var(--series-5))',
          6: 'hsl(var(--series-6))',
          7: 'hsl(var(--series-7))',
          8: 'hsl(var(--series-8))',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 3px)',
        sm: 'calc(var(--radius) - 5px)',
      },
      /*
       * Elevation, not outlines. A shadow says "this sits above the page"; a border
       * on everything says "this page is a grid of boxes", which is what the screens
       * looked like before.
       */
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.28), 0 1px 3px 0 rgb(0 0 0 / 0.18)',
        'card-hover': '0 4px 12px -2px rgb(0 0 0 / 0.38), 0 2px 6px -2px rgb(0 0 0 / 0.24)',
        panel: '0 8px 30px -6px rgb(0 0 0 / 0.5), 0 2px 8px -2px rgb(0 0 0 / 0.3)',
        rail: '8px 0 28px -10px rgb(0 0 0 / 0.65)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Dense analyst tooling: the base step is deliberately small.
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.125rem' }],
        base: ['0.875rem', { lineHeight: '1.25rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.125rem', { lineHeight: '1.625rem' }],
        '2xl': ['1.375rem', { lineHeight: '1.875rem' }],
        '3xl': ['1.75rem', { lineHeight: '2.125rem' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.18s ease-out',
        'accordion-up': 'accordion-up 0.18s ease-out',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
