import { Link } from 'react-router-dom';
import { BRAND_LOGO } from '../constants/brand';

export const LOGO_SIZES = {
  header: { height: 'h-11 sm:h-12', scale: 2.0, maxW: 'w-[240px] sm:w-[280px]' },
  auth: { height: 'h-14 sm:h-16', scale: 2.2, maxW: 'w-[min(92vw,360px)]' },
  hero: { height: 'h-28 sm:h-40 md:h-48 lg:h-52', scale: 2.6, maxW: 'w-[min(96vw,720px)]' },
  sidebar: { height: 'h-[3.5rem]', scale: 2.05, maxW: 'w-full' },
};

export function BrandLogoImage({
  className = '',
  size = 'header',
  heightClass,
  cropScale,
  maxWidth,
  alt = 'ZYDEX',
  withBackdrop = false,
}) {
  const preset = LOGO_SIZES[size] || LOGO_SIZES.header;
  const h = heightClass || preset.height;
  const scale = cropScale ?? preset.scale;
  const mw = maxWidth || preset.maxW;
  const useBackdrop = withBackdrop || size === 'sidebar';

  const imgBlock = (
    <div
      className={`flex items-center justify-center ${h} ${mw} overflow-visible`}
      style={{ minHeight: '3rem' }}
    >
      <img
        src={BRAND_LOGO}
        alt={alt}
        className="h-full w-auto max-w-full object-contain object-center select-none"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        draggable={false}
      />
    </div>
  );

  if (useBackdrop) {
    return (
      <div
        className={`rounded-xl w-full bg-gradient-to-br from-black/95 via-emerald-950 to-emerald-900/95 border border-emerald-600/35 shadow-lg shadow-black/40 px-3 py-2.5 flex justify-center ${className}`}
      >
        {imgBlock}
      </div>
    );
  }

  return <div className={`inline-flex justify-center overflow-visible ${className}`}>{imgBlock}</div>;
}

export function BrandLogoSingle(props) {
  const { to, className = '', ...rest } = props;
  const inner = <BrandLogoImage className={className} {...rest} />;
  if (to) {
    return (
      <Link to={to} className="block w-full min-w-0 shrink-0">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function BrandLogo(props) {
  return <BrandLogoSingle {...props} />;
}
