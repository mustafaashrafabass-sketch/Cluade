import type { ReactNode } from "react";
import { Breadcrumbs } from "../catalog/Breadcrumbs";

export function PageHeader({
  title,
  lead,
  breadcrumbs,
  breadcrumbLabel,
  children,
}: {
  title: string;
  lead?: string;
  breadcrumbs: { name: string; href?: string }[];
  breadcrumbLabel: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-white">
      <div className="container-page py-8 sm:py-10">
        <Breadcrumbs items={breadcrumbs} label={breadcrumbLabel} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h1>
        {lead ? <p className="mt-2 max-w-3xl text-[0.9375rem] leading-relaxed text-slate">{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}
