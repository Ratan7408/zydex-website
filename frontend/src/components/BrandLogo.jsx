import { Link } from 'react-router-dom';
import { BRAND_LOGO } from '../constants/brand';

export const LOGO_SIZES = {
  header: { height: 'h-9 sm:h-11', scale: 1.45, maxW: 'max-w-[120px] sm:max-w-[160px] md:max-w-[200px]' },
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
      className={`flex items-center justify-center ${h} ${mw} overflow-hidden`}
      style={{ minHeight: size === 'header' ? '2.25rem' : '3rem' }}
    >
      <img
        src={BRAND_LOGO}
        alt={alt}
        className="h-full w-auto max-w-full object-contain object-center select-none"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
        draggable={false}
        onError={(e) => {
          if (!e.currentTarget.dataset.fallback) {
            e.currentTarget.dataset.fallback = '1';
            e.currentTarget.src = `${import.meta.env.BASE_URL}zydex-logo.png`;
          }
        }}
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

  return <div className={`inline-flex justify-center overflow-hidden max-w-full ${className}`}>{imgBlock}</div>;
}

export function BrandLogoSingle(props) {
  const { to, className = '', ...rest } = props;
  const inner = <BrandLogoImage className={className} {...rest} />;
  if (to) {
    return (
      <Link to={to} className="block min-w-0 max-w-[45%] sm:max-w-[55%] md:max-w-none shrink">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function BrandLogo(props) {
  return <BrandLogoSingle {...props} />;
}
