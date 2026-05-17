import Image from 'next/image';
import Link from 'next/link';

export function BrandHeader({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
      <Link href="/condominiums" className="flex items-center">
        <Image
          src="/logo.png"
          alt="Audicon Condomínios"
          width={140}
          height={48}
          className="h-auto w-[140px]"
          priority
        />
      </Link>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
