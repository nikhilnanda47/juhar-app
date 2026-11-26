import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';

/**
 * A saree photo that fills its box. The box needs a shape (an aspect ratio or a size), `overflow: 'hidden'` and its
 * placeholder colour, which shows until the photo arrives, and for good when there is no photo (yet) or it cannot be
 * loaded, so a missing photo never leaves a broken-image icon.
 */
export default function ProductImage({ uri, alt }: { uri?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]); // a new address gets a fresh try

  if (!uri || failed) return null;
  return (
    <Image
      source={{ uri }}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      accessibilityLabel={alt}
      accessible
      onError={() => setFailed(true)}
    />
  );
}
