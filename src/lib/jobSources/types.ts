export type NormalizedJob = {
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  description: string;
  postedDate: Date | null;
  salaryRange: string | null;
};
