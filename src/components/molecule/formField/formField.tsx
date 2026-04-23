import { Label } from '@/components/atom/label'
import { cn } from '@/shared/helpers/cn'
import type { FormFieldProps } from './types'

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className={cn('text-xs text-destructive')} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
