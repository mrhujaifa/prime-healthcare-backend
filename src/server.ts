import app from "./app";
import { seedSuperAdmin } from "./app/utils/seed";
import { envVars } from "./config/env";

const bootStrap = async () => {
  try {
    await seedSuperAdmin();
    // Start the server
    app.listen(envVars.PORT, () => {
      console.log(`Server is running on http://localhost:${envVars.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
  }
};

bootStrap();
