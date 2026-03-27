import { NextResponse } from "next/server"
import * as z from "zod"

export function validateBody<T>(schema: z.Schema<T>, body: any) {
  const result = schema.safeParse(body)
  if (!result.success) {
    return {
      isValid: false as const,
      errors: result.error.issues,
      response: NextResponse.json(
        { error: "Validation failed", details: result.error.issues },
        { status: 400 }
      ),
    }
  }
  return {
    isValid: true as const,
    data: result.data,
  }
}
