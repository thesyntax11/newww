import express, { Application } from 'express';
import limiter from './security';
import helmet from './helmet';
import cors from './cors';
import errorHandler from './error-handler';

const app: Application = express();

app.use(limiter);
app.use(helmet);
app.use(cors);
app.use(errorHandler);

export default app;