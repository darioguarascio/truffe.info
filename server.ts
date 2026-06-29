import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handler as astroHandler } from './dist/server/entry.mjs';
import logger from './src/lib/http-logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '0.0.0.0';

const app = express();

app.set('trust proxy', true);
app.use(logger);
app.use(express.static(path.join(__dirname, 'dist/client')));
app.use(astroHandler);

app.listen(port, host, () => {
  console.log(`truffe.info listening on http://${host}:${port}`);
});
