import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function CommunityScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Community Feed</Text>
        <Text style={styles.subtitle}>Recent reviews and safety updates</Text>
        
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No reviews yet</Text>
          <Text style={styles.placeholderSubtext}>
            Be the first to share your experience!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  placeholder: {
    backgroundColor: '#fff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholderText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 5,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#bbb',
  },
});