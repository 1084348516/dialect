import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { dialectSchema } from './lib/schema';

export const collections = {
  dialects: defineCollection({
    loader: glob({ pattern: '*.yaml', base: './src/content/dialects' }),
    schema: dialectSchema,
  }),
};
