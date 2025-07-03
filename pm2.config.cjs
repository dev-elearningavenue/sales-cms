module.exports = {
    apps: [
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
      }
    ]
  };