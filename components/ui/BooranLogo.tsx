import Image from 'next/image';

export function BooranLogo({ className = '', priority = false, sizes = '224px' }: { className?: string; priority?: boolean; sizes?: string }) {
  return <span className={`inline-flex max-w-full items-center rounded-lg bg-black p-2 ${className}`}>
    <Image src="/images/booran-motors-logo.png" alt="Booran Motors" width={3508} height={932} sizes={sizes} priority={priority} className="block h-auto w-full object-contain" />
  </span>;
}
