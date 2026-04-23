import type { ComponentPropsWithoutRef } from 'react'
import type * as RadioGroupPrimitive from '@radix-ui/react-radio-group'

export type RadioGroupProps = ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Root
>
export type RadioGroupItemProps = ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Item
>
