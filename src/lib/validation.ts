import { z } from "zod";

export const resourceTypes = ["Notes", "PYQs", "Assignments", "Lab Manuals", "Presentations", "Reference Materials", "Other"] as const;
export const uploadSchema = z.object({
  title: z.string().trim().min(3).max(160), description: z.string().trim().max(2000).optional().default(""),
  branchName: z.string().trim().min(2).max(120), subjectName: z.string().trim().min(2).max(150), semester: z.coerce.number().int().min(1).max(12),
  resourceType: z.enum(resourceTypes), academicYear: z.string().trim().max(20).optional().default(""),
  contributorName: z.string().trim().max(80).optional().default(""),
});

export const reportSchema = z.object({ reason: z.enum(["Inappropriate", "Misleading", "Duplicate", "Corrupted or unusable", "Copyright-infringing", "Categorized incorrectly"]), details: z.string().trim().max(1000).optional().default("") });
