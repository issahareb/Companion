import { z } from 'zod';
import { insertLoadoutSchema, savedLoadouts } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  loadouts: {
    list: {
      method: 'GET' as const,
      path: '/api/loadouts/:bungieMembershipId' as const,
      responses: {
        200: z.array(z.custom<typeof savedLoadouts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/loadouts' as const,
      input: insertLoadoutSchema.extend({
        shareCode: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof savedLoadouts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    getByShareCode: {
      method: 'GET' as const,
      path: '/api/loadouts/share/:shareCode' as const,
      responses: {
        200: z.custom<typeof savedLoadouts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type LoadoutInput = z.infer<typeof api.loadouts.create.input>;
export type LoadoutResponse = z.infer<typeof api.loadouts.create.responses[201]>;