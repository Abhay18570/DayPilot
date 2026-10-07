import { View } from 'react-native';
import { brand } from '@/constants/daypilot';
// UI-only clock/checkmark mark; replace this component when the final asset is ready.
export function DayPilotLogo({ size = 52 }: { size?: number }) {
  return <View accessible accessibilityLabel="DayPilot logo" style={{ width: size, height: size, borderRadius: size * .29, backgroundColor: brand, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: size * .62, height: size * .62, borderRadius: size, borderWidth: size * .045, borderColor: '#FFFFFF' }}>
      <View style={{ position: 'absolute', left: '46%', top: '14%', height: '37%', width: size * .04, backgroundColor: '#FFFFFF', borderRadius: 4 }} />
      <View style={{ position: 'absolute', left: '46%', top: '46%', height: size * .04, width: '27%', backgroundColor: '#FFFFFF', borderRadius: 4, transform: [{ rotate: '-30deg' }] }} />
    </View>
    <View style={{ position: 'absolute', right: size * .08, bottom: size * .10, width: size * .30, height: size * .30, borderRadius: size, backgroundColor: '#C7F9DF', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * .15, height: size * .09, borderLeftWidth: size * .035, borderBottomWidth: size * .035, borderColor: '#166534', transform: [{ rotate: '-45deg' }, { translateY: -size * .015 }] }} />
    </View>
  </View>;
}
