import { t as uiText, useLanguage } from '../i18n/language.js';
export default function BrandLogo({ size = 48, className = '' }) {
  useLanguage();
  return (
    <span className={'brand-logo ' + className} style={{ width: size, height: size }}>
      <img src="/surshakti-logo.png" alt={uiText("Surshakti Residence")} width="2816" height="1536" />
    </span>
  );
}
