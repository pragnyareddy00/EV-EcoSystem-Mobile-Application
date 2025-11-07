import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { addDoc, collection, GeoPoint, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { AlertCircle, Camera, Map, Plus, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Card } from '../../components/Card';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../services/firebase';

// Type definitions for better type safety
interface FormData {
  stationName: string;
  address: string;
  notes: string;
}

interface FormErrors {
  stationName?: string;
  address?: string;
  image?: string;
  general?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = (SCREEN_WIDTH - SPACING.lg * 3) / 2;

export default function ContributeStationScreen() {
  const { userProfile } = useAuth();
  const router = useRouter();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    stationName: '',
    address: '',
    notes: '',
  });
  
  // Location and image state
  const [coordinates, setCoordinates] = useState<Location.LocationObjectCoords | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});

  /**
   * Updates form field values
   */
  const updateFormField = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  /**
   * Validates form inputs before submission
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.stationName.trim()) {
      newErrors.stationName = 'Station name is required';
    } else if (formData.stationName.trim().length < 3) {
      newErrors.stationName = 'Station name must be at least 3 characters';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Station address is required';
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Please provide a complete address';
    }

    if (imageUris.length === 0) {
      newErrors.image = 'At least one verification photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Fetches user's current location with fallback handling
   */
  const handleUseCurrentLocation = async () => {
    setIsLocationLoading(true);
    setErrors(prev => ({ ...prev, address: undefined }));

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location access is needed to use this feature. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        setIsLocationLoading(false);
        return;
      }

      // Get current position with balanced accuracy (better reliability)
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setCoordinates(location.coords);

      // Try reverse geocoding with error handling
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          const addressParts = [
            addr.name,
            addr.street,
            addr.subregion,
            addr.city,
            addr.region,
            addr.postalCode,
          ].filter(Boolean);
          
          const formattedAddress = addressParts.join(', ');
          if (formattedAddress) {
            updateFormField('address', formattedAddress);
          }
        }
      } catch (geocodeError) {
        console.log('Reverse geocoding unavailable, using coordinates only');
        // Still keep the coordinates for the database
        updateFormField('address', `Lat: ${location.coords.latitude.toFixed(6)}, Lng: ${location.coords.longitude.toFixed(6)}\n(Please edit with full address)`);
      }

      Alert.alert('Success', 'Location captured! Please verify or edit the address.');
    } catch (error: any) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        'Unable to fetch your location. Please enter the address manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLocationLoading(false);
    }
  };

  /**
   * Opens image picker and allows user to select photos
   */
  const handlePickImages = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera roll access is needed to upload photos. Please enable it in settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 6 - imageUris.length, // Max 6 images total
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImageUris = result.assets.map(asset => asset.uri);
        setImageUris(prev => [...prev, ...newImageUris]);
        setErrors(prev => ({ ...prev, image: undefined }));
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  /**
   * Opens camera to take a new photo
   */
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is needed to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUris(prev => [...prev, result.assets[0].uri]);
        setErrors(prev => ({ ...prev, image: undefined }));
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  /**
   * Prompts user to choose between camera or gallery
   */
  const handleImagePickerPrompt = () => {
    if (imageUris.length >= 6) {
      Alert.alert('Maximum Reached', 'You can only upload up to 6 photos.');
      return;
    }

    Alert.alert(
      'Add Photos',
      `Choose how you want to add verification photos (${imageUris.length}/6 used)`,
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Gallery', onPress: handlePickImages },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /**
   * Removes a specific image
   */
  const handleRemoveImage = (index: number) => {
    setImageUris(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Converts URI to Blob for Firebase upload
   */
  const uriToBlob = (uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.error('uriToBlob Error:', e);
        reject(new TypeError('Network request failed'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });
  };

  /**
   * Uploads all images to Firebase Storage
   */
  const uploadImagesAsync = async (uris: string[]): Promise<string[]> => {
    if (!userProfile) throw new Error("User not authenticated");

    const uploadPromises = uris.map(async (uri, index) => {
      try {
        // Update progress for each image
        setUploadProgress(Math.round((index / uris.length) * 100));
        
        const blob = await uriToBlob(uri);
        const fileName = `contribution_${Date.now()}_${index}.jpg`;
        const storageRef = ref(storage, `user_contributions/${userProfile.uid}/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
      } catch (error: any) {
        console.error(`Image upload error for image ${index}:`, error);
        throw new Error(`Failed to upload image ${index + 1}: ${error.message}`);
      }
    });

    return Promise.all(uploadPromises);
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async () => {
    // Check authentication
    if (!userProfile) {
      setErrors({ general: 'You must be logged in to contribute.' });
      Alert.alert('Authentication Required', 'Please log in to submit a contribution.');
      return;
    }

    // Validate form
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    setIsLoading(true);
    setErrors({});
    setUploadProgress(0);

    try {
      console.log('Starting image upload...');
      
      // Upload all images to Firebase Storage
      const photoURLs = await uploadImagesAsync(imageUris);
      
      console.log('All images uploaded successfully:', photoURLs);
      
      // Prepare contribution data
      const contributionData: any = {
        stationName: formData.stationName.trim(),
        address: formData.address.trim(),
        notes: formData.notes.trim(),
        photoURLs, // Now storing array of URLs
        status: 'pending',
        contributorName: userProfile.username || 'Anonymous',
        contributorEmail: userProfile.email || '',
        submittedBy_uid: userProfile.uid,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add GPS coordinates if available
      if (coordinates) {
        contributionData.location = new GeoPoint(
          coordinates.latitude,
          coordinates.longitude
        );
        contributionData.latitude = coordinates.latitude;
        contributionData.longitude = coordinates.longitude;
      }

      console.log('Saving to Firestore...');
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, 'userContributions'), contributionData);
      
      console.log('Document saved successfully:', docRef.id);

      // Reset form
      setFormData({ stationName: '', address: '', notes: '' });
      setImageUris([]);
      setCoordinates(null);
      setUploadProgress(0);
      setIsLoading(false);

      // Show success message
      Alert.alert(
        'Contribution Submitted! 🎉',
        'Thank you for helping build a better EV charging network! Your submission will be reviewed by our team shortly.',
        [
          {
            text: 'Submit Another',
            style: 'cancel',
          },
          {
            text: 'Go Back',
            onPress: () => router.back(),
          },
        ]
      );

    } catch (err: any) {
      console.error('Submission error:', err);
      setIsLoading(false);
      setErrors({
        general: err.message || 'Failed to submit contribution. Please try again.',
      });
      Alert.alert(
        'Submission Failed',
        err.message || 'Something went wrong. Please check your internet connection and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>Contribute a Station</Text>
            <Text style={styles.subtitle}>
              Help the community by submitting a new charging station for review.
            </Text>
          </View>

          {/* Form Card */}
          <Card style={styles.card}>
            {/* Station Name Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Station Name</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <TextInput
                style={[styles.input, errors.stationName && styles.inputError]}
                value={formData.stationName}
                onChangeText={(text) => updateFormField('stationName', text)}
                placeholder="e.g., Hotel Green Park Charging"
                placeholderTextColor={COLORS.textMuted}
                maxLength={100}
                editable={!isLoading}
              />
              {errors.stationName && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={COLORS.error} />
                  <Text style={styles.errorText}>{errors.stationName}</Text>
                </View>
              )}
            </View>

            {/* Station Address Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Station Address</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  isLocationLoading && styles.locationButtonDisabled,
                ]}
                onPress={handleUseCurrentLocation}
                disabled={isLoading || isLocationLoading}
                activeOpacity={0.7}
              >
                <View style={styles.locationButtonContent}>
                  {isLocationLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Map size={18} color={COLORS.primary} />
                  )}
                  <Text style={styles.locationButtonText}>
                    {isLocationLoading ? 'Fetching Location...' : 'Use Current Location'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TextInput
                style={[
                  styles.input,
                  styles.addressInput,
                  errors.address && styles.inputError,
                ]}
                value={formData.address}
                onChangeText={(text) => updateFormField('address', text)}
                placeholder="Full address of the charging station"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={300}
                editable={!isLoading}
              />
              {errors.address && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={COLORS.error} />
                  <Text style={styles.errorText}>{errors.address}</Text>
                </View>
              )}
            </View>

            {/* Verification Photos Field */}
            <View style={styles.fieldContainer}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Verification Photos</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <Text style={styles.photoSubtitle}>
                Add 1-6 photos showing the charging station and surroundings
              </Text>
              
              {imageUris.length > 0 ? (
                <View style={styles.imagesGrid}>
                  {imageUris.map((uri, index) => (
                    <View key={index} style={styles.imageItem}>
                      <Image source={{ uri }} style={styles.imagePreview} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => handleRemoveImage(index)}
                        disabled={isLoading}
                      >
                        <X size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {imageUris.length < 6 && (
                    <TouchableOpacity
                      style={styles.addImageButton}
                      onPress={handleImagePickerPrompt}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <Plus size={24} color={COLORS.primary} />
                      <Text style={styles.addImageText}>Add More</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePicker, errors.image && styles.imagePickerError]}
                  onPress={handleImagePickerPrompt}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <View style={styles.imagePlaceholder}>
                    <Camera size={32} color={COLORS.textSecondary} />
                    <Text style={styles.imagePickerText}>Tap to Add Photos</Text>
                    <Text style={styles.imagePickerSubtext}>
                      Add 1-6 photos of the charging station
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              
              {errors.image && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={14} color={COLORS.error} />
                  <Text style={styles.errorText}>{errors.image}</Text>
                </View>
              )}
              
              {imageUris.length > 0 && (
                <Text style={styles.imageCountText}>
                  {imageUris.length}/6 photos added
                </Text>
              )}
            </View>

            {/* Notes Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => updateFormField('notes', text)}
                placeholder="e.g., Located in B1 parking, 2 chargers available, open 24/7..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={500}
                editable={!isLoading}
              />
              <Text style={styles.characterCount}>
                {formData.notes.length}/500
              </Text>
            </View>
          </Card>

          {/* General Error Message */}
          {errors.general && (
            <View style={styles.generalErrorContainer}>
              <AlertCircle size={16} color={COLORS.error} />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={COLORS.white} size="small" />
                <Text style={styles.submitButtonText}>
                  {uploadProgress > 0 && uploadProgress < 100
                    ? `Uploading... ${uploadProgress}%`
                    : uploadProgress === 100
                    ? 'Saving...'
                    : 'Processing...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Submit for Review</Text>
            )}
          </TouchableOpacity>

          {/* Info Footer */}
          <View style={styles.infoFooter}>
            <Text style={styles.infoText}>
              All submissions are reviewed by our team before being added to the public database.
              Thank you for helping improve EV charging accessibility!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xs,
  },
  title: {
    fontSize: FONTS.sizes.xxl || 28,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  card: {
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  fieldContainer: {
    marginBottom: SPACING.xl,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  required: {
    color: COLORS.error,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  photoSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
    fontFamily: FONTS.family.regular,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  addressInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: SPACING.lg,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: SPACING.lg,
  },
  locationButton: {
    backgroundColor: COLORS.primary10,
    borderWidth: 1.5,
    borderColor: COLORS.primary20,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  locationButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
  },
  imagePicker: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.primary10,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imagePickerError: {
    borderColor: COLORS.error,
  },
  imagePlaceholder: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  imagePickerText: {
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  imagePickerSubtext: {
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  imageItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
    ...SHADOWS.xs,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  addImageButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    backgroundColor: COLORS.primary5,
    borderWidth: 2,
    borderColor: COLORS.primary20,
    borderStyle: 'dashed',
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  addImageText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  imageCountText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  characterCount: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    flex: 1,
    lineHeight: 18,
  },
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: COLORS.error + '08',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  generalErrorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    marginTop: SPACING.xl,
    ...SHADOWS.md,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.primary,
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoFooter: {
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: COLORS.primary5,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
});