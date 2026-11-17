export type WorkspaceTabKey = 'kb' | 'reminders' | 'bulk' | 'history';

export interface NavItemConfig {
  id: WorkspaceTabKey;
  label: string;
  badgeKey?: string;
  targetId: string;
}

export const WORKSPACE_NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'kb',
    label: 'Knowledge Base',
    targetId: 'tour-kb-nav'
  },
  {
    id: 'reminders',
    label: 'Reminders & Auto-Action',
    targetId: 'tour-reminders-nav'
  },
  {
    id: 'bulk',
    label: 'Bulk Multi-Site Runner',
    targetId: 'tour-bulk-nav'
  },
  {
    id: 'history',
    label: 'Form Fill History',
    targetId: 'tour-history-nav'
  }
];

export interface DemoMilestoneConfig {
  id: WorkspaceTabKey;
  label: string;
  sub: string;
  tab: WorkspaceTabKey;
}

export const DEMO_MILESTONES_CONFIG: DemoMilestoneConfig[] = [
  { 
    id: 'kb', 
    label: '1. Explore KB Scopes', 
    sub: 'Manage reference docs & scope toggles', 
    tab: 'kb' 
  },
  { 
    id: 'reminders', 
    label: '2. Form Reminders', 
    sub: 'Configure deadline auto-action policies', 
    tab: 'reminders' 
  },
  { 
    id: 'bulk', 
    label: '3. Bulk Multi-Site', 
    sub: 'Queue and run multi-site forms', 
    tab: 'bulk' 
  },
  { 
    id: 'history', 
    label: '4. Fill History & Audit', 
    sub: 'Inspect citations and confidence logs', 
    tab: 'history' 
  }
];
