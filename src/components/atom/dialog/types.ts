import type { ComponentPropsWithoutRef } from 'react'
import type * as DialogPrimitive from '@radix-ui/react-dialog'

export type DialogProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root>
export type DialogContentProps = ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
>
