import { z } from "zod";

const urlSchema = z.url();
const timestampSchema = z.string().optional();
const bodySchema = z.string().nullable().optional();
const optionalUrlSchema = z
  .union([urlSchema, z.literal("")])
  .nullable()
  .optional();

export const githubUserSchema = z
  .object({
    login: z.string(),
    type: z.string().optional(),
    html_url: urlSchema.optional(),
    avatar_url: urlSchema.optional(),
  })
  .nullable();

const repositorySchema = z.object({
  full_name: z.string(),
  html_url: urlSchema,
  owner: githubUserSchema.optional(),
});

const pullRequestSchema = z.object({
  number: z.number(),
  draft: z.boolean(),
  merged: z.boolean(),
  user: githubUserSchema,
  title: z.string(),
  body: bodySchema,
  html_url: urlSchema,
  head: z.object({ ref: z.string() }),
  base: z.object({ ref: z.string() }),
  merged_by: githubUserSchema.optional(),
  updated_at: timestampSchema,
});

const pullRequestReviewTargetSchema = pullRequestSchema.pick({
  number: true,
  user: true,
  title: true,
  body: true,
  html_url: true,
});

const issueSchema = z.object({
  number: z.number(),
  state: z.string(),
  title: z.string(),
  body: bodySchema,
  html_url: urlSchema,
  pull_request: z.object({}).optional(),
  labels: z.array(z.union([z.string(), z.object({ name: z.string().nullable() })])).optional(),
  assignees: z.array(githubUserSchema).optional(),
  updated_at: timestampSchema,
});

const discussionSchema = z.object({
  user: githubUserSchema,
  title: z.string(),
  body: bodySchema,
  html_url: urlSchema,
  category: z.object({ name: z.string() }).optional(),
  comments: z.number().optional(),
  updated_at: timestampSchema,
});

const commentSchema = z.object({
  user: githubUserSchema,
  body: bodySchema,
  html_url: urlSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
  is_answer: z.boolean().optional(),
});

export const pullRequestPayloadSchema = z.object({
  action: z.string(),
  pull_request: pullRequestSchema,
  repository: repositorySchema,
});

export const pullRequestReviewPayloadSchema = z.object({
  action: z.string(),
  pull_request: pullRequestReviewTargetSchema,
  review: z.object({
    state: z.string(),
    user: githubUserSchema,
    body: bodySchema,
    html_url: urlSchema.optional(),
    submitted_at: timestampSchema,
  }),
  repository: repositorySchema,
});

export const issuePayloadSchema = z.object({
  action: z.string(),
  issue: issueSchema,
  sender: githubUserSchema,
  repository: repositorySchema,
});

export const issueCommentPayloadSchema = z.object({
  action: z.string(),
  issue: issueSchema,
  comment: commentSchema,
  repository: repositorySchema,
});

export const discussionPayloadSchema = z.object({
  action: z.string(),
  discussion: discussionSchema,
  repository: repositorySchema,
});

export const discussionCommentPayloadSchema = z.object({
  action: z.string(),
  discussion: discussionSchema,
  comment: commentSchema,
  repository: repositorySchema,
});

export const wikiPayloadSchema = z.object({
  pages: z.array(
    z.object({
      action: z.string(),
      title: z.string(),
      summary: z.string().nullable().optional(),
      sha: z.string(),
      html_url: urlSchema,
    }),
  ),
  sender: githubUserSchema,
  repository: repositorySchema,
});

export const workflowRunPayloadSchema = z.object({
  action: z.string(),
  workflow_run: z.object({
    event: z.string(),
    conclusion: z.string().nullable(),
    name: z.string(),
    display_title: z.string().optional(),
    head_branch: z.string(),
    head_sha: z.string(),
    run_number: z.number(),
    run_attempt: z.number(),
    actor: githubUserSchema,
    html_url: urlSchema,
    jobs_url: urlSchema.optional(),
    head_repository: z.object({ full_name: z.string() }).optional(),
    updated_at: timestampSchema,
    pull_requests: z.array(z.object({ number: z.number().optional(), base: z.object({ ref: z.string() }) })).optional(),
  }),
  repository: repositorySchema,
});

export const deploymentStatusPayloadSchema = z.object({
  deployment: z.object({
    environment: z.string().nullable().optional(),
    ref: z.string(),
    sha: z.string(),
    description: bodySchema,
  }),
  deployment_status: z.object({
    state: z.string(),
    environment_url: optionalUrlSchema,
    log_url: optionalUrlSchema,
    target_url: optionalUrlSchema,
    description: bodySchema,
    updated_at: timestampSchema,
  }),
  sender: githubUserSchema,
  repository: repositorySchema,
});

export type GitHubUser = z.infer<typeof githubUserSchema>;
export type PullRequestPayload = z.infer<typeof pullRequestPayloadSchema>;
export type PullRequestReviewPayload = z.infer<typeof pullRequestReviewPayloadSchema>;
export type IssuePayload = z.infer<typeof issuePayloadSchema>;
export type IssueCommentPayload = z.infer<typeof issueCommentPayloadSchema>;
export type DiscussionPayload = z.infer<typeof discussionPayloadSchema>;
export type DiscussionCommentPayload = z.infer<typeof discussionCommentPayloadSchema>;
export type WikiPayload = z.infer<typeof wikiPayloadSchema>;
export type WorkflowRunPayload = z.infer<typeof workflowRunPayloadSchema>;
export type DeploymentStatusPayload = z.infer<typeof deploymentStatusPayloadSchema>;

export type ParsedGitHubEvent =
  | { readonly event: "pull_request"; readonly payload: PullRequestPayload }
  | {
      readonly event: "pull_request_review";
      readonly payload: PullRequestReviewPayload;
    }
  | { readonly event: "issues"; readonly payload: IssuePayload }
  | {
      readonly event: "issue_comment";
      readonly payload: IssueCommentPayload;
    }
  | { readonly event: "discussion"; readonly payload: DiscussionPayload }
  | {
      readonly event: "discussion_comment";
      readonly payload: DiscussionCommentPayload;
    }
  | { readonly event: "gollum"; readonly payload: WikiPayload }
  | { readonly event: "workflow_run"; readonly payload: WorkflowRunPayload }
  | {
      readonly event: "deployment_status";
      readonly payload: DeploymentStatusPayload;
    };

export function parseGitHubEvent(event: string, payload: unknown): ParsedGitHubEvent | undefined {
  switch (event) {
    case "pull_request":
      return { event, payload: pullRequestPayloadSchema.parse(payload) };
    case "pull_request_review":
      return { event, payload: pullRequestReviewPayloadSchema.parse(payload) };
    case "issues":
      return { event, payload: issuePayloadSchema.parse(payload) };
    case "issue_comment":
      return { event, payload: issueCommentPayloadSchema.parse(payload) };
    case "discussion":
      return { event, payload: discussionPayloadSchema.parse(payload) };
    case "discussion_comment":
      return { event, payload: discussionCommentPayloadSchema.parse(payload) };
    case "gollum":
      return { event, payload: wikiPayloadSchema.parse(payload) };
    case "workflow_run":
      return { event, payload: workflowRunPayloadSchema.parse(payload) };
    case "deployment_status":
      return { event, payload: deploymentStatusPayloadSchema.parse(payload) };
    default:
      return undefined;
  }
}
