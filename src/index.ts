import { createApp } from "./app.js";
import { config } from "./config.js";
import { buildPlatformCatalog } from "./platform/catalog.js";

const catalog = buildPlatformCatalog();

createApp().then((app) => {
  app.listen(config.port, () => {
    console.log(
      `${config.platformName} listening on http://localhost:${config.port} (${catalog.publishedEndpoints.length} paid routes, AI ${config.openai.enabled ? "enabled" : "disabled"})`,
    );
  });
});
