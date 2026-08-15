import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { CameraView, useCameraPermissions } from 'expo-camera'
import QRCode from 'react-native-qrcode-svg'
import { api, type CardOption } from './src/api'
import { tokenStore } from './src/storage'

const TOKEN_KEY = 'stampie_token'

type Screen =
  | { name: 'boot' }
  | { name: 'login' }
  | { name: 'change' }
  | { name: 'scanner'; orgName: string }
  | { name: 'issue'; orgName: string }

export default function App() {
  const [token, setToken] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'boot' })

  // Beim Start: gespeicherten Token laden und prüfen.
  useEffect(() => {
    ;(async () => {
      try {
        const saved = await tokenStore.get(TOKEN_KEY)
        if (!saved) return setScreen({ name: 'login' })
        const me = await api.me(saved)
        if (!me.ok || !me.data) {
          await tokenStore.del(TOKEN_KEY)
          return setScreen({ name: 'login' })
        }
        setToken(saved)
        setScreen(
          me.data.mustChangePassword
            ? { name: 'change' }
            : { name: 'scanner', orgName: me.data.org.name },
        )
      } catch {
        setScreen({ name: 'login' })
      }
    })()
  }, [])

  const onLoggedIn = useCallback(async (newToken: string, mustChange: boolean) => {
    await tokenStore.set(TOKEN_KEY, newToken)
    setToken(newToken)
    if (mustChange) {
      setScreen({ name: 'change' })
      return
    }
    const me = await api.me(newToken)
    setScreen({ name: 'scanner', orgName: me.data?.org.name ?? 'Betrieb' })
  }, [])

  const onPasswordChanged = useCallback(async () => {
    const me = token ? await api.me(token) : null
    setScreen({ name: 'scanner', orgName: me?.data?.org.name ?? 'Betrieb' })
  }, [token])

  const onLogout = useCallback(async () => {
    await tokenStore.del(TOKEN_KEY)
    setToken(null)
    setScreen({ name: 'login' })
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {screen.name === 'boot' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : screen.name === 'login' ? (
        <LoginScreen onLoggedIn={onLoggedIn} />
      ) : screen.name === 'change' ? (
        <ChangePasswordScreen token={token!} onDone={onPasswordChanged} />
      ) : screen.name === 'issue' ? (
        <IssueScreen
          token={token!}
          onBack={() => setScreen({ name: 'scanner', orgName: screen.orgName })}
        />
      ) : (
        <ScannerScreen
          token={token!}
          orgName={screen.orgName}
          onLogout={onLogout}
          onIssue={() => setScreen({ name: 'issue', orgName: screen.orgName })}
        />
      )}
    </SafeAreaView>
  )
}

function LoginScreen({
  onLoggedIn,
}: {
  onLoggedIn: (token: string, mustChange: boolean) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    const res = await api.login(username.trim(), password)
    setBusy(false)
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Anmeldung fehlgeschlagen.')
      return
    }
    onLoggedIn(res.data.token, res.data.mustChangePassword)
  }

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Stampie</Text>
      <Text style={styles.subtitle}>Betriebs-Anmeldung</Text>

      <TextInput
        style={styles.input}
        placeholder="Benutzername"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Passwort"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, (busy || !username || !password) && styles.buttonDisabled]}
        disabled={busy || !username || !password}
        onPress={submit}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Anmelden</Text>}
      </TouchableOpacity>
    </View>
  )
}

function ChangePasswordScreen({ token, onDone }: { token: string; onDone: () => void }) {
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (pw1 !== pw2) return setError('Die Passwörter stimmen nicht überein.')
    if (pw1.length < 8) return setError('Mindestens 8 Zeichen.')
    setBusy(true)
    setError(null)
    const res = await api.changePassword(token, pw1)
    setBusy(false)
    if (!res.ok) return setError(res.error ?? 'Konnte nicht gespeichert werden.')
    onDone()
  }

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Neues Passwort</Text>
      <Text style={styles.subtitle}>Bitte das Start-Passwort jetzt ändern.</Text>

      <TextInput
        style={styles.input}
        placeholder="Neues Passwort"
        secureTextEntry
        value={pw1}
        onChangeText={setPw1}
      />
      <TextInput
        style={styles.input}
        placeholder="Neues Passwort wiederholen"
        secureTextEntry
        value={pw2}
        onChangeText={setPw2}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, (busy || !pw1 || !pw2) && styles.buttonDisabled]}
        disabled={busy || !pw1 || !pw2}
        onPress={submit}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Speichern</Text>}
      </TouchableOpacity>
    </View>
  )
}

interface ScanFeedback {
  kind: 'success' | 'error'
  text: string
}

function ScannerScreen({
  token,
  orgName,
  onLogout,
  onIssue,
}: {
  token: string
  orgName: string
  onLogout: () => void
  onIssue: () => void
}) {
  const [permission, requestPermission] = useCameraPermissions()
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null)
  const locked = useRef(false)

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
  }, [permission, requestPermission])

  const handleScan = async ({ data }: { data: string }) => {
    if (locked.current) return
    locked.current = true

    const res = await api.stamp(token, data)
    if (res.ok && res.data) {
      setFeedback({
        kind: 'success',
        text: res.data.completesCard
          ? `Karte voll! ${res.data.stamps}/${res.data.stampGoal} — Belohnung einlösen`
          : `Gestempelt — ${res.data.stamps}/${res.data.stampGoal}`,
      })
    } else {
      setFeedback({ kind: 'error', text: res.error ?? 'Fehler beim Stempeln.' })
    }

    // Kurze Sperre gegen Mehrfach-Scan, dann wieder freigeben.
    setTimeout(() => {
      locked.current = false
      setFeedback(null)
    }, 2500)
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.form}>
        <Text style={styles.title}>Kamera</Text>
        <Text style={styles.subtitle}>Für das Scannen wird die Kamera benötigt.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Kamera erlauben</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.scannerWrap}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{orgName}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onIssue}>
            <Text style={styles.headerAction}>+ Karte ausgeben</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.logout}>Abmelden</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />

      <View style={styles.hintBar}>
        <Text style={styles.hint}>Kunden-QR in den Rahmen halten</Text>
      </View>

      {feedback ? (
        <View
          style={[
            styles.feedback,
            feedback.kind === 'success' ? styles.feedbackOk : styles.feedbackErr,
          ]}
        >
          <Text style={styles.feedbackText}>{feedback.text}</Text>
        </View>
      ) : null}
    </View>
  )
}

function IssueScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [cards, setCards] = useState<CardOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [issued, setIssued] = useState<{ serial: string; url: string; stampGoal: number } | null>(
    null,
  )

  useEffect(() => {
    ;(async () => {
      const res = await api.listCards(token)
      if (!res.ok || !res.data) return setError(res.error ?? 'Karten konnten nicht geladen werden.')
      setCards(res.data.cards)
    })()
  }, [token])

  const issue = async (card: CardOption) => {
    setBusyId(card.id)
    setError(null)
    const res = await api.issueCard(token, card.id)
    setBusyId(null)
    if (!res.ok || !res.data) return setError(res.error ?? 'Ausgeben fehlgeschlagen.')
    setIssued(res.data)
  }

  return (
    <View style={styles.issueWrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.headerAction}>‹ Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Karte ausgeben</Text>
        <View style={{ width: 60 }} />
      </View>

      {issued ? (
        <View style={styles.qrBox}>
          <Text style={styles.qrHint}>Vom Kunden scannen lassen:</Text>
          <View style={styles.qrCard}>
            <QRCode value={issued.url} size={220} />
          </View>
          <Text style={styles.serial}>{issued.serial}</Text>
          <TouchableOpacity style={styles.button} onPress={() => setIssued(null)}>
            <Text style={styles.buttonText}>Weitere Karte ausgeben</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack}>
            <Text style={[styles.logout, { marginTop: 12 }]}>Fertig</Text>
          </TouchableOpacity>
        </View>
      ) : cards === null ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.subtitle}>Noch keine Karte angelegt.</Text>
        </View>
      ) : (
        <View style={{ padding: 16, gap: 10 }}>
          <Text style={styles.subtitle}>Welche Karte soll der Kunde bekommen?</Text>
          {cards.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.cardRow}
              disabled={busyId !== null}
              onPress={() => issue(c)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{c.programName}</Text>
                <Text style={styles.cardMeta}>
                  Ziel: {c.stampGoal} Stempel {c.isPublished ? '' : '· Entwurf'}
                </Text>
              </View>
              {busyId === c.id ? <ActivityIndicator color="#1a1a1a" /> : <Text style={styles.plus}>+</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error ? <Text style={[styles.error, { padding: 16 }]}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f4' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  form: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c0392b', fontSize: 14 },
  scannerWrap: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f4',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerAction: { fontSize: 14, color: '#1a1a1a', fontWeight: '600' },
  logout: { fontSize: 14, color: '#666' },
  issueWrap: { flex: 1, backgroundColor: '#f5f5f4' },
  qrBox: { alignItems: 'center', padding: 24, gap: 14 },
  qrHint: { fontSize: 15, color: '#666' },
  qrCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16 },
  serial: { fontSize: 18, fontWeight: '700', letterSpacing: 2, color: '#1a1a1a' },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 14,
  },
  cardName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  cardMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  plus: { fontSize: 26, color: '#1a1a1a', fontWeight: '400' },
  camera: { flex: 1 },
  hintBar: { padding: 16, backgroundColor: '#f5f5f4', alignItems: 'center' },
  hint: { fontSize: 14, color: '#666' },
  feedback: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 90,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  feedbackOk: { backgroundColor: '#1e8e3e' },
  feedbackErr: { backgroundColor: '#c0392b' },
  feedbackText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
})
