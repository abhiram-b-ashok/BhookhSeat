import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { colors, radii } from '@/constants/theme';

type Props = {
  imageUrl?: string | null;
  imageSource?: ImageSourcePropType;
  height?: number;
};

export default function RestaurantImage({
  imageUrl,
  imageSource,
  height = 140,
}: Props) {
  const [failed, setFailed] = useState(false);

  const source = imageSource ?? (imageUrl ? { uri: imageUrl } : undefined);

  if (source && !failed) {
    return (
      <Image
        source={source}
        style={[styles.base, { height }]}
        contentFit="cover"
        onError={(event) => {
          console.error('Restaurant image failed:', event.error);
          setFailed(true);
        }}
      />
    );
  }

  return (
    <View style={[styles.base, styles.placeholder, { height }]}>
      <Ionicons
        name="restaurant"
        size={40}
        color={colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: radii.lg,
  },
  placeholder: {
    backgroundColor: colors.header,
    alignItems: 'center',
    justifyContent: 'center',
  },
});