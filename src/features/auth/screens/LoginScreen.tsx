import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Fonts } from '@shared/theme';
import type { IconName } from '@shared/types/icon';
import { useAuth } from '@features/auth/store/auth.store';

interface DemoAccount {
  role: string;
  email: string;
  password: string;
  icon: IconName;
  desc: string;
}

const DEMO: DemoAccount[] = [
  { role: 'Kasir', email: 'sari@toko.id', password: 'kasir', icon: 'storefront', desc: 'POS · Buka shift · Jualan' },
  { role: 'Kasir', email: 'dewi@toko.id', password: 'kasir', icon: 'storefront', desc: 'POS · Void · Lihat HPP' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Perhatian', 'Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const res = login(email, password);
      setLoading(false);
      if (!res.ok) Alert.alert('Login Gagal', 'Email atau password salah (INVALID_CREDENTIALS)');
    }, 600);
  };

  const fillDemo = (d: DemoAccount) => {
    setEmail(d.email);
    setPassword(d.password);
  };

  return (
    <LinearGradient colors={['#7FE7C8', '#4FD1B5', '#1DAA8B']} style={styles.gradient}>
      <StatusBar barStyle="light-content" backgroundColor="#1DAA8B" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="storefront" size={44} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>KasirMu</Text>
            <Text style={styles.tagline}>POS Mobile · Kasir</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.welcomeText}>Selamat Datang</Text>
            <Text style={styles.subText}>Masuk dengan akun JWT email/password</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.primaryLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="nama@toko.id"
                  placeholderTextColor={Colors.textLight}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.primaryLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Masukkan password"
                  placeholderTextColor={Colors.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient colors={['#FF8A65', '#FFAB91']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtnGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.loginBtnText}>Masuk</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.demoLabel}>Akun demo (tap untuk isi otomatis)</Text>
            {DEMO.map((d) => (
              <TouchableOpacity key={d.email} style={styles.demoRow} onPress={() => fillDemo(d)} activeOpacity={0.8}>
                <View style={styles.demoIcon}>
                  <Ionicons name={d.icon} size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoRole}>{d.role}</Text>
                  <Text style={styles.demoDesc}>{d.desc}</Text>
                </View>
                <Text style={styles.demoCred}>{d.email}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.footer}>© 2026 KasirMu Mobile v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: { fontSize: Fonts.sizes.xxxl, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  tagline: { fontSize: Fonts.sizes.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  welcomeText: { fontSize: Fonts.sizes.xxl, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  subText: { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.lg },
  inputGroup: { marginBottom: Spacing.base },
  label: { fontSize: Fonts.sizes.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.xs },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, height: 50, fontSize: Fonts.sizes.base, color: Colors.textPrimary },
  eyeBtn: { padding: Spacing.xs },
  loginBtn: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.xs, marginBottom: Spacing.lg },
  loginBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  loginBtnText: { fontSize: Fonts.sizes.base, fontWeight: '700', color: Colors.white },
  demoLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  demoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  demoRole: { fontSize: Fonts.sizes.sm, fontWeight: '800', color: Colors.textPrimary },
  demoDesc: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  demoCred: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: Fonts.sizes.xs, marginTop: Spacing.lg },
});
