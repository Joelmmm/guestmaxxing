---
name: react-hook-form-and-zod
description: Patterns and best practices for implementing React Hook Form with Zod validation, including performance optimizations and common pitfalls.
---

# React Hook Form + Zod Validation

**Status:** Production Ready ✅ | **Last Verified:** 2026-01-20
**Latest Versions:** `react-hook-form@7.71.1`, `zod@4.3.5`, `@hookform/resolvers@5.2.2`

## Quick Start

```bash
npm install react-hook-form@7.70.0 zod@4.3.5 @hookform/resolvers@5.2.2
```

### Basic Form Pattern

```typescript
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

type FormData = z.infer<typeof schema>

const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { email: '', password: '' }, // REQUIRED to prevent uncontrolled warnings
})

<form onSubmit={handleSubmit(onSubmit)}>
  <input {...register('email')} />
  {errors.email && <span role="alert">{errors.email.message}</span>}
</form>
```

### Server Validation
**CRITICAL:** Never skip server-side validation. Use the same schema.

```typescript
const data = schema.parse(await req.json())
```

## Key Patterns

### `useForm` Options (Validation Modes)
- `mode: 'onSubmit'` (default) - Best performance
- `mode: 'onBlur'` - Good balance
- `mode: 'onChange'` - Live feedback, more re-renders
- `shouldUnregister: true` - Remove field data when unmounted (use for multi-step forms)

### Zod Refinements (Cross-field Validation)
```typescript
z.object({ password: z.string(), confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ['confirm'], // CRITICAL: Error appears on this field
  })
```

### Zod Transforms
```typescript
z.string().transform((val) => val.toLowerCase()) // Data manipulation
z.string().transform(parseInt).refine((v) => v > 0) // Chain with refine
```

### Zod v4.3.0+ Features
```typescript
// Exact optional (can omit field, but NOT undefined)
z.string().exactOptional()

// Exclusive union (exactly one must match)
z.xor([z.string(), z.number()])

// Import from JSON Schema
z.fromJSONSchema({ type: "object", properties: { name: { type: "string" } } })
```

> [!NOTE]
> `zodResolver` connects Zod to React Hook Form, preserving type safety.

## Registration

### `register` (Standard HTML Inputs)
```tsx
<input {...register('email')} /> // Uncontrolled, best performance
```

### `Controller` (Third-party Components)
Use for React Select, date pickers, or custom components without `ref`.
```tsx
<Controller
  name="category"
  control={control}
  render={({ field }) => <CustomSelect {...field} />} // MUST spread {...field}
/>
```

## Error Handling

### Displaying Errors
```tsx
{errors.email && <span role="alert">{errors.email.message}</span>}
{errors.address?.street?.message} // Nested errors (use optional chaining)
```

### Server Errors
```typescript
const onSubmit = async (data) => {
  const res = await fetch('/api/submit', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const { errors: serverErrors } = await res.json()
    Object.entries(serverErrors).forEach(([field, msg]) => setError(field, { message: msg }))
  }
}
```

## Advanced Patterns

### `useFieldArray` (Dynamic Lists)
```tsx
const { fields, append, remove } = useFieldArray({ control, name: 'contacts' })

{fields.map((field, index) => (
  <div key={field.id}> {/* CRITICAL: Use field.id, NOT index */}
    <input {...register(`contacts.${index}.name` as const)} />
    {errors.contacts?.[index]?.name && <span>{errors.contacts[index].name.message}</span>}
    <button onClick={() => remove(index)}>Remove</button>
  </div>
))}
<button onClick={() => append({ name: '', email: '' })}>Add</button>
```

### Async Validation (Debounce)
```typescript
const debouncedValidation = useDebouncedCallback(() => trigger('username'), 500)
```

### Multi-Step Forms
```typescript
const step1 = z.object({ name: z.string(), email: z.string().email() })
const step2 = z.object({ address: z.string() })
const fullSchema = step1.merge(step2)

const nextStep = async () => {
  const isValid = await trigger(['name', 'email']) // Validate specific fields
  if (isValid) setStep(2)
}
```

### Conditional Validation
```typescript
z.discriminatedUnion('accountType', [
  z.object({ accountType: z.literal('personal'), name: z.string() }),
  z.object({ accountType: z.literal('business'), companyName: z.string() }),
])

// Or use refinement:
z.object({
  showAddress: z.boolean(),
  address: z.string(),
}).refine((data) => {
  if (data.showAddress) return data.address.length > 0;
  return true;
}, {
  message: "Address is required",
  path: ["address"],
})
```

## shadcn/ui Integration

> [!WARNING]
> `shadcn/ui` deprecated the `Form` component in some versions. Use the `Field` component for new implementations if applicable.

**Common Import Mistake:** Avoid auto-importing `Form` from `react-hook-form`.
```typescript
// ✅ Correct:
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem } from "@/components/ui/form"; // shadcn

// ❌ Wrong (auto-import mistake):
import { useForm, Form } from "react-hook-form";
```

### Legacy Form component
```tsx
<FormField control={form.control} name="username" render={({ field }) => (
  <FormItem>
    <FormControl><Input {...field} /></FormControl>
    <FormMessage />
  </FormItem>
)} />
```

## Performance

- Use `register` over `Controller` for standard inputs.
- Use `watch('email')` instead of `watch()` to isolate re-renders.
- Set `shouldUnregister: true` for multi-step forms to clear data on unmount.

### Large Forms (300+ Fields)
Forms with 300+ fields using a resolver AND reading `formState` can freeze for 10-15s (Issue #13129).

**Workarounds:**
1. **Avoid destructuring `formState`**: Read properties inline.
   ```typescript
   // ✅ Fast:
   if (!form.formState.isValid) return; 
   ```
2. **Use `mode: "onSubmit"`**: Validate only on submit.
3. **Split into sub-forms**: Use multiple smaller forms.
4. **Lazy render fields**: Use tabs/accordions to mount only visible fields.

## Critical Rules

- [x] **Always set `defaultValues`** (prevents uncontrolled warnings).
- [x] **Validate on BOTH client and server**.
- [x] **Use `field.id` as key** in `useFieldArray`.
- [x] **Spread `{...field}`** in `Controller` render.
- [x] **Use `z.infer<typeof schema>`** for type inference.
- [ ] **Never skip server validation** (security!).
- [ ] **Never mutate values directly** (use `setValue()`).
- [ ] **Never mix controlled + uncontrolled patterns**.

## Known Issues (20+ Prevented)

- **Zod v4 Type Inference (#13109):** Use `z.infer<typeof schema>` explicitly.
- **Uncontrolled→Controlled Warning:** Always set `defaultValues`.
- **Nested Object Errors:** Use optional chaining: `errors.address?.street?.message`.
- **Zod v4 Optional Fields Bug (#13102):** Setting `.optional()` to `""` incorrectly triggers errors. Use `.or(z.literal(""))`.
- **`useFieldArray` SSR ID Mismatch (#12782):** Hydration mismatch in Next.js. Use client-only rendering or V8.
- **Next.js 16 `reset()` Validation Bug (#13110):** Fixed in v7.65.0+. Use `setValue()` as workaround.

## Upcoming Changes in V8 (Beta)

V8 (beta since 2026-01-11) introduces several breaking changes:

- **`useFieldArray`**: `id` → `key`.
- **Watch component**: `names` → `name`.
- **`watch()` callback API removed**: Use `useWatch` or manual subscription.
- **`setValue()` no longer updates `useFieldArray`**: Use `replace()` API.

**V8 Benefits:** Fixes SSR hydration mismatch, improved performance, and better types.
Monitor releases for stable version.