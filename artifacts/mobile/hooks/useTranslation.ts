import { translations } from '@/constants/translations';
import { useApp } from '@/context/AppContext';

const FONTS_EN = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

const FONTS_HI = {
  regular: 'NotoSansDevanagari_400Regular',
  medium: 'NotoSansDevanagari_500Medium',
  semiBold: 'NotoSansDevanagari_600SemiBold',
  bold: 'NotoSansDevanagari_700Bold',
};

export function useTranslation() {
  const { data } = useApp();
  const lang = data.language ?? 'en';
  const t = translations[lang];
  const fonts = lang === 'hi' ? FONTS_HI : FONTS_EN;
  return { t, fonts, lang };
}
