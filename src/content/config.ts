import { defineCollection, z } from 'astro:content';

const truffe = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
    meta_title: z.string().optional(),
    meta_description: z.string().optional(),
  }),
});

export const collections = { truffe };
