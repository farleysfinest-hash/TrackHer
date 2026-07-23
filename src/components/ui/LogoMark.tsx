import logoMark from '../../assets/logo-mark.png';

interface LogoMarkProps {
  size: number;
  className?: string;
}

/**
 * Brand mark. The artwork uses cream negative space for the face — so it always
 * sits on a fixed cream disc (never theme-flipped), or it turns into a void in dark mode.
 */
export function LogoMark({ size, className = '' }: LogoMarkProps) {
  return (
    <span
      className={[
        'relative block shrink-0 overflow-hidden rounded-full',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: size,
        height: size,
        backgroundColor: '#F7F3EE',
      }}
    >
      <img
        src={logoMark}
        alt=""
        width={size}
        height={size}
        className="block h-full w-full object-contain"
      />
    </span>
  );
}
