export const colors = {
  red: '#FF4655',
  redDeep: '#D93A48',
  bg: '#0F1923',
  surface: '#17232E',
  surfaceHigh: '#203040',
  line: 'rgba(236, 232, 225, 0.08)',
  text: '#ECE8E1',
  muted: '#8B97A2',
  white: '#FFFFFF',
};

export const fonts = {
  display: 'BarlowCondensed_700Bold',
  displayMedium: 'BarlowCondensed_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
};

const currencyIcon = (id: string) => `https://media.valorant-api.com/currencies/${id}/displayicon.png`;
export const VP_ICON = currencyIcon('85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741');
export const KC_ICON = currencyIcon('85ca954a-41f2-ce94-9b45-8ca3dd39a00d');
export const RAD_ICON = currencyIcon('e59aa87c-4cbf-517a-5983-6e81511be9b7');
