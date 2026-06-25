import cors from "cors";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { z } from "zod";
import { config } from "./config.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  roles: z.array(z.enum(["student", "teacher", "recruiter", "admin"])).default(["student"]),
  bio: z.string().optional(),
  onboarding_answers: z.record(z.unknown()).default({}),
  fcm_token: z.string().optional()
});

const users = new Map<string, z.infer<typeof signupSchema> & { id: string; created_at: string }>();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "learnlink-backend-gateway",
    routes: ["/auth/signup", "/auth/me", "/community", "/courses", "/jobs", "/stripe/webhook"]
  });
});

app.post("/auth/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_signup_payload", details: parsed.error.flatten() });
  }

  const id = crypto.randomUUID();
  const user = { ...parsed.data, id, created_at: new Date().toISOString() };
  users.set(id, user);

  await fetch(`${config.agentsUrl}/agents/recommend`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user_id: id,
      onboarding_answers: user.onboarding_answers,
      resume_url: undefined
    })
  }).catch(() => undefined);

  res.status(201).json({
    user,
    next: ["upload_resume_optional", "register_fcm_token", "open_home_feed"],
    token: `dev-token-${id}`
  });
});

app.get("/auth/me", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer dev-token-", "");
  const user = token ? users.get(token) : undefined;
  if (!user) return res.status(401).json({ error: "unauthorized" });
  res.json({ user });
});

app.post("/stripe/webhook", (req, res) => {
  res.json({
    received: true,
    delegated_to: ["community subscriptions", "courses purchases", "jobs post fees", "premium profile"]
  });
});

app.use("/community", createProxyMiddleware({ target: config.communityUrl, changeOrigin: true, pathRewrite: { "^/community": "" } }));
app.use("/courses", createProxyMiddleware({ target: config.coursesUrl, changeOrigin: true, pathRewrite: { "^/courses": "" } }));
app.use("/jobs", createProxyMiddleware({ target: config.jobsUrl, changeOrigin: true, pathRewrite: { "^/jobs": "" } }));

app.listen(config.port, () => {
  console.log(`gateway listening on :${config.port}`);
});

