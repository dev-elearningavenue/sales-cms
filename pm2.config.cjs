module.exports = {
  apps: [
    {
      name: "next-app",
      script: "npm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "sales-cms-app",
      script: "server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "mongo-listener",
      script: "src/lib/server.ts",
      interpreter: "node",
      args: "--loader ts-node/esm"
    },
    {
      name: "invoice-cron",
      script: "src/services/cronJobs.ts",
      interpreter: "node",
      args: "--loader ts-node/esm"
    }
  ]
};