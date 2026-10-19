"use client";

import { useEffect, type AnchorHTMLAttributes } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { event: AnalyticsEvent };

/** External/contact link that records a non-personal analytics event on click. */
export function TrackedLink({ event, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(event);
        onClick?.(e);
      }}
    />
  );
}

/** Records a view event once per page view; rendered by server pages. */
export function TrackOnMount({ event }: { event: AnalyticsEvent }) {
  const key = JSON.stringify(event);
  useEffect(() => {
    track(JSON.parse(key) as AnalyticsEvent);
  }, [key]);
  return null;
}
