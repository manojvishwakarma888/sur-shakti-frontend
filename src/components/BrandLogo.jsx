export default function BrandLogo({ size = 48, className = '' }) {
  return (
    <span className={'brand-logo ' + className} style={{ width: size, height: size }}>
      <img src="/surshakti-logo.png" alt="Surshakti Residence" width="2816" height="1536" />
    </span>
  );
}
