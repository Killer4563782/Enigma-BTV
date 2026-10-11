export type ReleaseEntry = {
  id: string;
  version: string;
  title: string;
  summary: string;
  type: string;
  status: string;
  changes: string[];
  tags: string[];
  date: string;
  createdAt?: string;
};
