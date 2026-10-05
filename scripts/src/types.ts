export interface ProfileConfig {
  profile: {
    username: string;
    profile_url: string;
    display_name: string;
    short_name: string;
    headline: string;
    location: string;
    website: string;
    photo_alt: string;
    bio: string[];
  };
  socials: Record<string, string>;
  focus: string[];
  featured_repositories: string[];
  project_rules: {
    latest_limit: number;
    featured_limit: number;
    exclude_forks: boolean;
    exclude_archived: boolean;
    public_only: boolean;
  };
  content: {
    show_constellation: boolean;
    show_terrain: boolean;
    show_intelligence: boolean;
    show_language_galaxy: boolean;
    show_activity_pulse: boolean;
  };
  media: {
    profile_image: string;
    hero_animation: string;
    intro_video: string;
    intro_video_url: string;
  };
  world: {
    enabled: boolean;
    title: string;
    url: string;
    reduced_motion_default: boolean;
    quality: 'auto' | 'low' | 'medium' | 'high';
  };
}

export interface GithubUser {
  login: string;
  name: string | null;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  createdAt: string;
}

export interface ProjectRecord {
  name: string;
  fullName: string;
  url: string;
  description: string;
  primaryLanguage?: string;
  languages?: Record<string, number>;
  topics: string[];
  stars: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  archived: boolean;
  fork: boolean;
  visibility: string;
  defaultBranch: string;
  license?: string;
  latestRelease?: { tag: string; publishedAt?: string; url: string };
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  weekday: number;
}

export interface ContributionCalendar {
  total: number;
  weeks: ContributionDay[][];
}

export interface CollectedData {
  collectedAt: string;
  fixture?: boolean;
  user: GithubUser;
  repos: ProjectRecord[];
  contributions: ContributionCalendar | null;
}

export interface OutputFile {
  /** repo-relative POSIX path */
  path: string;
  content: string;
}
