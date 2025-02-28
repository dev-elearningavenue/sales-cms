module.exports = {
    apps: [
      {
        name: "mongo-listener",
        script: "src/lib/server.ts",
        interpreter: "node",
        args: "--loader ts-node/esm"
      }
    ]
  };