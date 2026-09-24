"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ToastDemo() {
  const { toast } = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast("Good · next review in 6 days", "success")}
      >
        Success toast
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          toast("Again — this card will come back this session", "danger")
        }
      >
        Danger toast
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => toast("Take saved to this card")}
      >
        Info toast
      </Button>
    </div>
  );
}
