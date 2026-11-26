import type { ReactNode } from 'react';

/**
 * A centred message page in the Juhar style: an icon, a serif heading, a line of text and some buttons.
 * Used for "page not found", "something went wrong" and "you're offline". Has no hooks, so it can be used from
 * server and client components alike.
 */
export default function StatusPage({
  icon, title, children, actions,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[60vh] py-12 text-center" role="alert">
      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-5 text-text-tertiary">
        {icon}
      </div>
      <h1 className="font-serif text-headline-lg-mobile lg:text-headline-lg text-text-primary mb-2">{title}</h1>
      {children ? <div className="font-sans text-body-md text-text-secondary max-w-md mb-6">{children}</div> : <div className="mb-4" />}
      {actions ? <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
}
