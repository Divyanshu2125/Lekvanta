import DescopeClient from '@descope/node-sdk';
import { env } from '../config/env';

export const descopeClient = DescopeClient({
  projectId: env.DESCOPE_PROJECT_ID,
});
