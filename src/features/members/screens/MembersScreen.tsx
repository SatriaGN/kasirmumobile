import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type ListRenderItem,
  type KeyboardTypeOptions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts, Shadow } from '@shared/theme';
import { ScreenHeader } from '@shared';
import { formatCurrency } from '@shared/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@features/auth/store/auth.store';
import { useMembers } from '@features/members/store/members.store';
import type { Member, MemberType, MemberForm as MemberFormData } from '@features/members/types/members.type';

/** The kasir stack exposes this screen with no params. */
interface MembersScreenProps {
  navigation: { goBack: () => void };
}

export default function MembersScreen({ navigation }: MembersScreenProps) {
  const { members, memberTypes, addMember, updateMember, deleteMember } = useMembers();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const insets = useSafeAreaInsets();
  const canManage = hasPermission('canManageMembers');

  const filtered = members.filter(
    (m) => m.id !== 'm0' && (m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search))
  );

  const handleDelete = (m: Member) => {
    Alert.alert('Hapus Member', `Hapus ${m.name}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          const res = deleteMember(m.id);
          if (!res.ok) Alert.alert('Tidak Bisa Hapus', (res.error ?? '') + '. Lunasi piutang dulu via menu Piutang.');
        },
      },
    ]);
  };

  const renderItem: ListRenderItem<Member> = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.phone} · {item.memberTypeName}
        </Text>
        <View style={styles.badgeRow}>
          {item.canCredit && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Bisa Kredit</Text>
            </View>
          )}
          {item.totalDebt > 0 && (
            <View style={[styles.badge, { backgroundColor: Colors.errorLight }]}>
              <Text style={[styles.badgeText, { color: Colors.error }]}>Utang {formatCurrency(item.totalDebt)}</Text>
            </View>
          )}
        </View>
      </View>
      {canManage && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setEditing(item);
              setFormVisible(true);
            }}
          >
            <Ionicons name="create-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.safe}>
      <ScreenHeader title="Kelola Member" subtitle={`${filtered.length} member`} onBack={() => navigation.goBack()} />
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={Colors.textLight} />
          <TextInput style={styles.searchInput} placeholder="Cari nama / telepon..." placeholderTextColor={Colors.textLight} value={search} onChangeText={setSearch} />
        </View>
      </View>

      {!canManage && (
        <View style={styles.gateBox}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.warning} />
          <Text style={styles.gateText}>Anda hanya bisa mencari & memilih member. Kelola (tambah/edit/hapus) butuh izin canManageMembers.</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 90 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={56} color={Colors.border} />
            <Text style={styles.emptyText}>Tidak ada member</Text>
          </View>
        }
      />

      {canManage && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 20 + insets.bottom }]}
          onPress={() => {
            setEditing(null);
            setFormVisible(true);
          }}
          activeOpacity={0.9}
        >
          <LinearGradient colors={['#FF8A65', '#FFAB91']} style={styles.fabGrad}>
            <Ionicons name="add" size={26} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <MemberForm
        visible={formVisible}
        editing={editing}
        memberTypes={memberTypes}
        onClose={() => setFormVisible(false)}
        onSubmit={(form) => {
          if (editing) updateMember(editing.id, form);
          else addMember(form);
          setFormVisible(false);
        }}
      />
    </View>
  );
}

interface MemberFormProps {
  visible: boolean;
  editing: Member | null;
  memberTypes: MemberType[];
  onClose: () => void;
  onSubmit: (form: MemberFormData) => void;
}

function MemberForm({ visible, editing, memberTypes, onClose, onSubmit }: MemberFormProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [typeId, setTypeId] = useState<string | undefined>(memberTypes[0]?.id);

  React.useEffect(() => {
    if (visible) {
      setName(editing?.name || '');
      setPhone(editing?.phone === '-' ? '' : editing?.phone || '');
      setEmail(editing?.email || '');
      setAddress(editing?.address || '');
      setTypeId(editing?.memberTypeId || memberTypes[0]?.id);
    }
  }, [visible, editing, memberTypes]);

  const submit = () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Perhatian', 'Nama & telepon wajib diisi');
      return;
    }
    if (!typeId) return;
    onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), memberTypeId: typeId, status: 'active' });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={[styles.overlay, { paddingLeft: insets.left, paddingRight: insets.right }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.formSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>{editing ? 'Edit Member' : 'Tambah Member'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ paddingHorizontal: Spacing.base }} showsVerticalScrollIndicator={false}>
            <Field label="Nama *" value={name} onChange={setName} placeholder="Nama lengkap" />
            <Field label="Telepon *" value={phone} onChange={setPhone} placeholder="08xx" keyboardType="phone-pad" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="opsional" keyboardType="email-address" />
            <Field label="Alamat" value={address} onChange={setAddress} placeholder="opsional" />
            <Text style={styles.fieldLabel}>Tipe Member</Text>
            <View style={styles.typeRow}>
              {memberTypes.map((t) => (
                <TouchableOpacity key={t.id} style={[styles.typeChip, typeId === t.id && styles.typeChipOn]} onPress={() => setTypeId(t.id)}>
                  <Text style={[styles.typeChipText, typeId === t.id && styles.typeChipTextOn]}>
                    {t.name}
                    {t.canCredit ? ' (kredit)' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>canCredit ditentukan server dari tipe member.</Text>
          </ScrollView>
          <TouchableOpacity style={styles.submitBtn} onPress={submit} activeOpacity={0.88}>
            <LinearGradient colors={['#1DAA8B', '#4FD1B5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitGrad}>
              <Text style={styles.submitText}>{editing ? 'Simpan Perubahan' : 'Simpan Member'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}

function Field({ label, value, onChange, placeholder, keyboardType }: FieldProps) {
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textLight}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  searchWrap: { padding: Spacing.base, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.background, borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, fontSize: Fonts.sizes.sm, color: Colors.textPrimary },
  gateBox: { flexDirection: 'row', gap: 8, margin: Spacing.base, marginBottom: 0, backgroundColor: Colors.warningLight, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'flex-start' },
  gateText: { flex: 1, fontSize: Fonts.sizes.xs, color: Colors.warning, lineHeight: 17 },
  list: { padding: Spacing.base },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, padding: Spacing.md, borderRadius: Radius.lg, marginBottom: Spacing.sm, ...Shadow.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontWeight: '800', fontSize: 18 },
  name: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary },
  meta: { fontSize: Fonts.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  badge: { backgroundColor: Colors.primarySoft, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: '700', color: Colors.primary },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.md },
  fab: { position: 'absolute', right: 20, borderRadius: 30, overflow: 'hidden', ...Shadow.lg },
  fabGrad: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,30,0.55)', justifyContent: 'flex-end' },
  formSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 24 },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base },
  formTitle: { fontSize: Fonts.sizes.lg, fontWeight: '800', color: Colors.textPrimary },
  fieldLabel: { fontSize: Fonts.sizes.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Fonts.sizes.sm, color: Colors.textPrimary, backgroundColor: Colors.background },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  typeChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  typeChipText: { fontSize: Fonts.sizes.xs, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextOn: { color: Colors.primary },
  hint: { fontSize: 10, color: Colors.textLight, marginBottom: Spacing.md },
  submitBtn: { marginHorizontal: Spacing.base, marginTop: Spacing.sm, borderRadius: Radius.md, overflow: 'hidden' },
  submitGrad: { paddingVertical: 15, alignItems: 'center' },
  submitText: { color: Colors.white, fontWeight: '800', fontSize: Fonts.sizes.base },
});
