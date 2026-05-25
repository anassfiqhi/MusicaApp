import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  visible: boolean;
  initialName?: string;
  onCancel: () => void;
  onCreate: (name: string) => void;
}

export default function CreatePlaylistModal({ visible, initialName = '', onCancel, onCreate }: Props) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
  };

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onCancel}>
      <LinearGradient colors={['#3d3d3d', '#1a1a1a', '#000000']} style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inner}
        >
          <Text style={styles.heading}>Give your playlist a name</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleCreate}
            selectionColor="#fff"
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createBtn, !name.trim() && styles.createBtnDisabled]}
              onPress={handleCreate}
            >
              <Text style={styles.createText}>Create</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 48,
  },
  heading: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
  },
  input: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
    paddingVertical: 8,
    width: '70%',
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
  },
  cancelBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cancelText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  createBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: '#1DB954',
  },
  createBtnDisabled: { opacity: 0.4 },
  createText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
