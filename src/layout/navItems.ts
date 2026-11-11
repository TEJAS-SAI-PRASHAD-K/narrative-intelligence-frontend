import {
  Bell,
  FileBarChart,
  Globe,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Network,
  Newspaper,
  PenLine,
  Plug,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * The navigation model, declared once.
 *
 * `IconRail` used to link 8 of the app's 18 routes; cohorts, domains, alerts
 * and the key manager were reachable only by deep link or by digging through the gear
 * menu. Declaring the model here -- rather than inline in the rail's JSX -- is what
 * lets `navItems.test.ts` assert that every route in `App.tsx` is either navigable or
 * deliberately excluded, so the next page added cannot silently become unreachable.
 *
 * The grouping follows the five questions the product exists to answer
 * (docs/demo.md): what is being said, who is saying it, who hosts it, how it spreads,
 * and how it is being pushed artificially. Overview sits above the groups because it
 * is the landing screen, not a peer of the investigative surfaces.
 */

export interface NavItem {
  /** Path template. `:projectSlug` is substituted with the active project. */
  path: string;
  label: string;
  Icon: LucideIcon;
  /** One sentence, shown in the collapsed rail's tooltip. */
  hint: string;
  end?: boolean;
  /**
   * When set, the item opens a panel instead of navigating, and `path` is where that
   * panel's "see all" link goes. Jobs works this way: what an analyst needs after
   * pressing a button that returned a 202 is the job that button started, not the
   * full history page.
   */
  opensPanel?: 'jobs';
}

export interface NavSection {
  /** Rendered as a small uppercase heading; a hairline separator when collapsed. */
  title: string | null;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      {
        path: '/p/:projectSlug/overview',
        label: 'Overview',
        Icon: LayoutDashboard,
        hint: 'The shape of the corpus: volume, engagement, sentiment and emotion over time.',
      },
    ],
  },
  {
    title: 'Investigate',
    items: [
      {
        path: '/p/:projectSlug/narratives',
        label: 'Narratives',
        Icon: Newspaper,
        hint: 'What is being said — clustered stories, ranked by priority.',
      },
      {
        path: '/p/:projectSlug/drivers',
        label: 'Drivers',
        Icon: TrendingUp,
        hint: 'Who is saying it — the authors, hashtags and links carrying the conversation.',
      },
      {
        path: '/p/:projectSlug/cohorts',
        label: 'Cohorts',
        Icon: Users,
        hint: 'Groups of accounts that behave alike, and how they were detected.',
      },
      {
        path: '/p/:projectSlug/domains',
        label: 'Domains',
        Icon: Globe,
        hint: 'Who hosts it — the sites being linked to, scored for risk.',
      },
      {
        path: '/p/:projectSlug/network',
        label: 'Network',
        Icon: Network,
        hint: 'How it spreads — replies, reposts and co-posting between accounts.',
      },
    ],
  },
  {
    title: 'Produce',
    items: [
      {
        path: '/p/:projectSlug/curate',
        label: 'Curate',
        Icon: PenLine,
        hint: 'Group posts into a narrative by hand, instead of waiting for clustering.',
      },
      {
        path: '/p/:projectSlug/reports',
        label: 'Reports',
        Icon: FileBarChart,
        hint: 'Export the current view as a document a colleague can read offline.',
      },
      {
        path: '/p/:projectSlug/alerts',
        label: 'Alerts',
        Icon: Bell,
        hint: 'Rules that watch this project and tell you when something changes.',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        path: '/p/:projectSlug/sources',
        label: 'Sources',
        Icon: Plug,
        hint: 'Where the posts come from, when each source last ran, and how to re-run it.',
      },
      {
        path: '/jobs',
        label: 'Jobs',
        Icon: ListChecks,
        hint: 'Background work you have started: what is running, what finished, what failed.',
        opensPanel: 'jobs',
      },
      {
        path: '/settings/keys',
        label: 'API keys',
        Icon: KeyRound,
        hint: 'Keys that grant access to this backend, and what each one may do.',
      },
    ],
  },
];

/**
 * Routes that exist but are deliberately not in the sidebar, with the reason. The test
 * reads this list, so removing an entry here without adding a nav item fails the build
 * rather than quietly orphaning a page.
 */
export const NON_NAV_ROUTES: Record<string, string> = {
  '/': 'The project picker. Reached from the project switcher, not the sidebar.',
  '/p/:projectSlug': 'Redirects to overview.',
  '/p/:projectSlug/narratives/:narrativeId': 'Detail view, reached from the feed.',
  '/p/:projectSlug/domains/:domain': 'Detail view, reached from the domain table.',
  '/p/:projectSlug/authors/:authorId': 'Detail view, reached from any author name.',
  '/p/:projectSlug/network/graph': 'Full-screen graph, launched from the network page.',
  '/kitchen-sink': 'Component gallery for development; linked from the gear menu.',
  '*': 'Not-found fallback.',
};

/** Substitutes the active project into a path template. */
export function navPath(path: string, slug: string): string {
  return path.replace(':projectSlug', slug);
}

/** Every nav item, flattened -- used by the test and by the mobile sheet. */
export function allNavItems(): NavItem[] {
  return NAV_SECTIONS.flatMap((s) => s.items);
}
