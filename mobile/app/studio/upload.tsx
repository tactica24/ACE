import { useState } from 'react';
import { Text, TextInput, View, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Screen from '@/components/Screen';
import PrimaryButton from '@/components/PrimaryButton';
import { apiPost } from '@/lib/client';
import { theme } from '@/lib/theme';

const OptionGroup = ({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) => (
  <View style={{ gap: 8 }}>
    <Text style={{ fontWeight: '700' }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: value === opt ? theme.brand : '#f1e7d8'
          }}
        >
          <Text style={{ color: value === opt ? 'white' : theme.ink }}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  </View>
);

export default function UploadScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceTier, setPriceTier] = useState('STANDARD');
  const [rightsTier, setRightsTier] = useState('SHARED');
  const [videoType, setVideoType] = useState('FEATURE');
  const [ageRating, setAgeRating] = useState('ALL');
  const [category, setCategory] = useState('General');
  const [genres, setGenres] = useState('');
  const [teaserSec, setTeaserSec] = useState('300');
  const [durationSec, setDurationSec] = useState('1800');
  const [tags, setTags] = useState('');
  const [highlightSeconds, setHighlightSeconds] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
    if (!result.canceled) {
      setFile(result.assets[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Select a video file.');
      return;
    }
    setLoading(true);
    try {
      const presign = await apiPost<{ url: string; key: string }>(`/api/studio/upload-url`, {
        filename: file.name,
        contentType: file.mimeType || 'video/mp4'
      });

      await FileSystem.uploadAsync(presign.url, file.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': file.mimeType || 'video/mp4'
        }
      });

      await apiPost(`/api/studio/video`, {
        title,
        description,
        videoType,
        ageRating,
        category,
        genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
        priceTier,
        rightsTier,
        teaserSec: parseInt(teaserSec || '0', 10),
        durationSec: parseInt(durationSec || '0', 10),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        highlightSeconds: highlightSeconds
          .split(',')
          .map((v) => parseInt(v.trim(), 10))
          .filter((v) => Number.isFinite(v)),
        r2Key: presign.key
      });

      alert('Upload submitted for review.');
    } catch (err) {
      alert('Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>Upload new title</Text>
      <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={[styles.input, { height: 90 }]} multiline />
      <OptionGroup label="Price Tier" options={['SNACK', 'STANDARD', 'PREMIERE']} value={priceTier} onChange={setPriceTier} />
      <OptionGroup label="Rights Tier" options={['SHARED', 'EXCLUSIVE']} value={rightsTier} onChange={setRightsTier} />
      <OptionGroup label="Movie Type" options={['FEATURE', 'SERIES', 'SHORT', 'SKIT', 'DOCUMENTARY', 'ADVERT']} value={videoType} onChange={setVideoType} />
      <OptionGroup label="Age Rating" options={['ALL', 'PG13', 'PG16', 'PG18']} value={ageRating} onChange={setAgeRating} />
      <TextInput placeholder="Category (e.g. Love, Action)" value={category} onChangeText={setCategory} style={styles.input} />
      <TextInput placeholder="Genres (comma separated)" value={genres} onChangeText={setGenres} style={styles.input} />
      <TextInput placeholder="Teaser seconds" value={teaserSec} onChangeText={setTeaserSec} style={styles.input} keyboardType="numeric" />
      <TextInput placeholder="Duration seconds" value={durationSec} onChangeText={setDurationSec} style={styles.input} keyboardType="numeric" />
      <TextInput placeholder="Highlight seconds (comma separated)" value={highlightSeconds} onChangeText={setHighlightSeconds} style={styles.input} />
      <TextInput placeholder="Tags (comma separated)" value={tags} onChangeText={setTags} style={styles.input} />
      <PrimaryButton label={file ? `Selected: ${file.name}` : 'Select video file'} onPress={pickFile} />
      <PrimaryButton label={loading ? 'Uploading...' : 'Upload & Create'} onPress={handleUpload} disabled={loading} />
    </Screen>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'white'
  }
};
