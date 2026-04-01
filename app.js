require("dotenv").config();

const { app, dbReady } = require("./server");

const PORT = process.env.PORT || 3000;

dbReady
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Kebpro webapp fut: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Indítási hiba:", error);
    process.exit(1);
  });

