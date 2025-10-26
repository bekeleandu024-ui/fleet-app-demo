"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/server/prisma";

const optionalText = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().optional()
);

const optionalDate = z.preprocess(
  (value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.coerce.date().optional()
);

const orderSchema = z.object({
  customer: z.string().trim().min(1, "Customer is required"),
  origin: z.string().trim().min(1, "Origin is required"),
  destination: z.string().trim().min(1, "Destination is required"),
  puWindowStart: optionalDate,
  puWindowEnd: optionalDate,
  delWindowStart: optionalDate,
  delWindowEnd: optionalDate,
  requiredTruck: optionalText,
  notes: optionalText
});

export async function createOrderAction(formData: FormData) {
  const submission = Object.fromEntries(formData.entries());
  const result = orderSchema.safeParse(submission);

  if (!result.success) {
    const message = result.error.errors[0]?.message ?? "Invalid form submission";
    return { error: message };
  }

  const data = result.data;

  await prisma.order.create({
    data: {
      customer: data.customer.trim(),
      origin: data.origin.trim(),
      destination: data.destination.trim(),
      puWindowStart: data.puWindowStart ?? null,
      puWindowEnd: data.puWindowEnd ?? null,
      delWindowStart: data.delWindowStart ?? null,
      delWindowEnd: data.delWindowEnd ?? null,
      requiredTruck: data.requiredTruck ?? null,
      notes: data.notes ?? null
    }
  });

  revalidatePath("/orders");
  redirect("/orders");
}
