export default function handler(request, response) {
  const buildId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || "local"
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
  response.status(200).json({ app: "DestiVerse Vision", version: buildId, buildId, environment: process.env.VERCEL_ENV || "development" })
}
