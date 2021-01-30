const throttle = require("@sitespeed.io/throttle");
// Returns a promise
const options = { up: 360, down: 780, rtt: 200 };

throttle.start(options).then(() => {
  const express = require("express");
  const app = express();
  const port = 3001;

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  const server = app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });

  setInterval(
    () =>
      server.getConnections((err, connections) =>
        console.log(`${connections} connections currently open`)
      ),
    60000
  );

  shutDown = () => {
    console.log("Received kill signal, shutting down gracefully");
    throttle.stop().then(() => {
      server.close(() => {
        console.log("Closed out remaining connections");
        process.exit(0);
      });

      setTimeout(() => {
        console.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 10000);

      connections.forEach((curr) => curr.end());
      setTimeout(() => connections.forEach((curr) => curr.destroy()), 5000);
    }).catch(err => {
        console.error(`failed to un-throttle`, err);
    });
  };

  process.on("SIGTERM", shutDown);
  process.on("SIGINT", shutDown);

  let connections = [];

  server.on("connection", (connection) => {
    connections.push(connection);
    connection.on(
      "close",
      () => (connections = connections.filter((curr) => curr !== connection))
    );
  });
}).catch(err => {
    console.error(`failed to throttle`, err);
});
