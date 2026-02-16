import app from "./app";
import { envVars } from "./config/env";

const bootStrap = () => {
  try {
    // Start the server
    app.listen(envVars.PORT, () => {
      console.log(`Server is running on http://localhost:${envVars.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
  }
};

bootStrap();
