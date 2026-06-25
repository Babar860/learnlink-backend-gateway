import "dotenv/config";

export const config = {
  port: Number(process.env.GATEWAY_PORT ?? 4000),
  communityUrl: process.env.COMMUNITY_SERVICE_URL ?? "http://localhost:4100",
  coursesUrl: process.env.COURSES_SERVICE_URL ?? "http://localhost:4200",
  jobsUrl: process.env.JOBS_SERVICE_URL ?? "http://localhost:4300",
  agentsUrl: process.env.AGENTS_SERVICE_URL ?? "http://localhost:5005"
};

