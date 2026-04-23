import { Switch } from '@/components/atom/switch'
import { Label } from '@/components/atom/label'
import type { ConsentToggleProps } from './types'

export function ConsentToggle({
  id,
  label,
  description,
  required,
  checked,
  onChange,
  disabled,
}: ConsentToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="flex-1">
        <Label htmlFor={id} className="cursor-pointer text-base">
          {label}
          {required ? (
            <span className="ml-1 text-xs font-normal text-destructive">
              (จำเป็น)
            </span>
          ) : null}
        </Label>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  )
}
