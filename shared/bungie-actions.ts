import { z } from "zod";

// Platform IDs are int32; instance and character IDs stay strings to preserve int64 precision.
export const membershipTypeSchema = z
  .union([z.number(), z.string().regex(/^\d+$/).transform(Number)])
  .pipe(
    z
      .number()
      .int()
      .refine(
        (value) => [1, 2, 3, 5, 6, 10].includes(value),
        "Invalid Destiny platform",
      ),
  );
const id = z.string().regex(/^\d{1,20}$/, "Expected a Bungie ID");
const hash = z.number().int().min(0).max(0xffffffff);
const character = { characterId: id, membershipType: membershipTypeSchema };
export const transferSchema = z.object({
  ...character,
  itemReferenceHash: hash,
  itemId: id,
  stackSize: z.number().int().min(1).max(999999).default(1),
  transferToVault: z.boolean(),
});
export const equipSchema = z.object({ ...character, itemId: id });
export const pullPostmasterSchema = transferSchema.omit({
  transferToVault: true,
});
export const lockSchema = equipSchema.extend({ state: z.boolean() });
export const equipItemsSchema = z.object({
  ...character,
  itemIds: z.array(id).min(1).max(10),
});
// Preserve the existing browser contract; the adapter maps it to Bungie's itemId/plug body.
export const insertPlugSchema = z.object({
  ...character,
  itemInstanceId: id,
  socketIndex: z.number().int().min(0).max(100),
  plugItemHash: hash,
});
export const equipLoadoutSchema = z.object({
  ...character,
  loadoutIndex: z.number().int().min(0).max(9),
});
export const snapshotLoadoutSchema = equipLoadoutSchema.extend({
  colorHash: hash.optional(),
  iconHash: hash.optional(),
  nameHash: hash.optional(),
});
export const clearLoadoutSchema = equipLoadoutSchema;

export const updateLoadoutSchema = equipLoadoutSchema.extend({
  nameHash: hash,
});
