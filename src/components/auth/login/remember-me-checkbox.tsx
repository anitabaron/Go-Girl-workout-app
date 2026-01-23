"use client";

import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type RememberMeCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
};

export function RememberMeCheckbox({
  checked,
  onChange,
  disabled,
}: RememberMeCheckboxProps) {
  const id = useId();

  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
        aria-label="Zapamiętaj mnie"
        data-test-id="login-remember-me-checkbox"
      />
      <Label
        htmlFor={id}
        className="text-sm font-normal cursor-pointer"
        onClick={() => !disabled && onChange(!checked)}
      >
        Zapamiętaj mnie
      </Label>
    </div>
  );
}
