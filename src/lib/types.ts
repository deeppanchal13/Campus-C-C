export type Branch = { id: string; name: string; code: string };
export type Subject = { id: string; name: string; code: string | null; branch_id: string | null; semester: number };
export type Resource = {
  id: string; title: string; description: string | null; resource_type: string; academic_year: string | null;
  contributor_name: string | null; original_file_name: string; file_size: number; mime_type: string;
  created_at: string; download_count: number; semester: number; branch: { name: string; code: string } | null;
  subject: { name: string } | null;
};
