import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Card({ children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {React.Children.map(children, (child) => {
        // If a string or number is passed directly, wrap it in a Text component
        if (typeof child === 'string' || typeof child === 'number') {
          return <Text>{child}</Text>;
        }
        return child;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
});
