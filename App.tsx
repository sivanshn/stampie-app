import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar as NativeStatusBar,
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
  | { name: 'home'; orgName: string }
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
            : { name: 'home', orgName: me.data.org.name },
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
    setScreen({ name: 'home', orgName: me.data?.org.name ?? 'Betrieb' })
  }, [])

  const onPasswordChanged = useCallback(async () => {
    const me = token ? await api.me(token) : null
    setScreen({ name: 'home', orgName: me?.data?.org.name ?? 'Betrieb' })
  }, [token])

  const onLogout = useCallback(async () => {
    await tokenStore.del(TOKEN_KEY)
    setToken(null)
    setScreen({ name: 'login' })
  }, [])

  return (
    <SafeAreaView style={[styles.safe, screen.name === 'scanner' && styles.safeScanner]}>
      <StatusBar style={screen.name === 'scanner' ? 'light' : 'dark'} />
      {screen.name === 'boot' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : screen.name === 'login' ? (
        <LoginScreen onLoggedIn={onLoggedIn} />
      ) : screen.name === 'change' ? (
        <ChangePasswordScreen token={token!} onDone={onPasswordChanged} />
      ) : screen.name === 'home' ? (
        <HomeScreen
          orgName={screen.orgName}
          onLogout={onLogout}
          onStamp={() => setScreen({ name: 'scanner', orgName: screen.orgName })}
          onIssue={() => setScreen({ name: 'issue', orgName: screen.orgName })}
        />
      ) : screen.name === 'issue' ? (
        <IssueScreen
          token={token!}
          onBack={() => setScreen({ name: 'home', orgName: screen.orgName })}
        />
      ) : (
        <ScannerScreen
          token={token!}
          orgName={screen.orgName}
          onBack={() => setScreen({ name: 'home', orgName: screen.orgName })}
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

/**
 * Wie eine Ablehnung an der Kasse heißen soll.
 *
 * Eine gelöschte Karte ist der wichtigste Fall: der Kassierer soll nicht ein zweites Mal
 * scannen, sondern dem Kunden sagen, dass diese Karte nicht mehr läuft. Deshalb steht das
 * in der Überschrift und nicht nur im Kleingedruckten.
 */
function refusalTitle(code: string | null): string {
  switch (code) {
    case 'card_deleted':
    case 'not_found':
      return 'Karte gelöscht'
    case 'forbidden':
      return 'Fremde Karte'
    case 'full':
      return 'Karte ist voll'
    case 'cooldown':
      return 'Gerade eben gestempelt'
    case 'invalid':
      return 'QR nicht lesbar'
    case 'rate_limited':
      return 'Zu viele Buchungen'
    case 'offline':
      return 'Keine Verbindung'
    default:
      return 'Nicht gestempelt'
  }
}

/** Ergänzt die Server-Meldung um den Satz, der an der Kasse die Frage „und jetzt?" klärt. */
function refusalHint(code: string | null): string | null {
  switch (code) {
    case 'card_deleted':
    case 'not_found':
      return 'Nochmal scannen hilft nicht — dieses Kartenprogramm gibt es nicht mehr. Gib dem Kunden eine neue Karte aus.'
    case 'cooldown':
      return 'Das ist die Sperre gegen Doppelscans.'
    case 'offline':
      return 'Es wurde nichts gebucht. Sobald das Netz wieder da ist, erneut scannen.'
    default:
      return null
  }
}

function HomeScreen({
  orgName,
  onLogout,
  onStamp,
  onIssue,
}: {
  orgName: string
  onLogout: () => void
  onStamp: () => void
  onIssue: () => void
}) {
  return (
    <View style={styles.homeWrap}>
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.title}>Stampie</Text>
          <Text style={styles.subtitle}>{orgName}</Text>
        </View>
        <TouchableOpacity onPress={onLogout}>
          <Text style={styles.logout}>Abmelden</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.homeActions}>
        <TouchableOpacity style={styles.homePrimaryButton} onPress={onStamp}>
          <Text style={styles.homePrimaryText}>Karte stempeln</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeSecondaryButton} onPress={onIssue}>
          <Text style={styles.homeSecondaryText}>Karte ausgeben</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function ScannerScreen({
  token,
  orgName,
  onBack,
}: {
  token: string
  orgName: string
  onBack: () => void
}) {
  const [permission, requestPermission] = useCameraPermissions()
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const locked = useRef(false)

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
  }, [permission, requestPermission])

  const handleScan = async ({ data }: { data: string }) => {
    if (locked.current) return
    locked.current = true

    const res = await api.stamp(token, data)
    if (res.ok && res.data) {
      const text = res.data.completesCard
        ? `Die Karte wurde gestempelt und ist jetzt voll (${res.data.stamps}/${res.data.stampGoal}).`
        : `Die Karte wurde gestempelt (${res.data.stamps}/${res.data.stampGoal}).`
      setFeedback({ kind: 'success', text })
      Alert.alert(
        'Karte gestempelt',
        text,
        [
          {
            text: 'Zurück zur Startseite',
            onPress: onBack,
          },
        ],
        { cancelable: false },
      )
    } else {
      const hint = refusalHint(res.code)
      const text = `${res.error ?? 'Fehler beim Stempeln.'}${hint ? `\n\n${hint}` : ''}`
      setFeedback({ kind: 'error', text })
      Alert.alert(
        refusalTitle(res.code),
        text,
        [
          {
            text: 'Zurück zur Startseite',
            onPress: onBack,
          },
        ],
        { cancelable: false },
      )
    }
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
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchEnabled}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />

      <View style={styles.cameraTopBar}>
        <TouchableOpacity style={styles.cameraIconButton} onPress={onBack}>
          <Text style={styles.cameraIconText}>×</Text>
        </TouchableOpacity>
        <Text style={styles.cameraTitle}>{orgName}</Text>
        <TouchableOpacity
          style={[styles.cameraIconButton, torchEnabled && styles.cameraIconButtonActive]}
          onPress={() => setTorchEnabled((enabled) => !enabled)}
        >
          <Text style={styles.cameraIconText}>Blitz</Text>
        </TouchableOpacity>
      </View>

      <View pointerEvents="none" style={styles.scanOverlay}>
        <View style={styles.scanFrame}>
          <View style={[styles.scanCorner, styles.scanCornerTopLeft]} />
          <View style={[styles.scanCorner, styles.scanCornerTopRight]} />
          <View style={[styles.scanCorner, styles.scanCornerBottomLeft]} />
          <View style={[styles.scanCorner, styles.scanCornerBottomRight]} />
        </View>
        <Text style={styles.scanHint}>QR-Code scannen</Text>
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
    if (!res.ok || !res.data) {
      // Die Karte wurde gelöscht, während die Liste hier noch stand: Liste nachziehen,
      // damit der nächste Griff nicht wieder danebengeht.
      if (res.code === 'not_found') {
        const fresh = await api.listCards(token)
        if (fresh.ok && fresh.data) setCards(fresh.data.cards)
      }
      return setError(res.error ?? 'Ausgeben fehlgeschlagen.')
    }
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
  safe: {
    flex: 1,
    backgroundColor: '#f5f5f4',
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0,
  },
  safeScanner: { backgroundColor: '#000', paddingTop: 0 },
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
  homeWrap: {
    flex: 1,
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  homeActions: { flex: 1, justifyContent: 'center', gap: 14 },
  homePrimaryButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  homePrimaryText: { color: '#fff', fontSize: 19, fontWeight: '700' },
  homeSecondaryButton: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  homeSecondaryText: { color: '#1a1a1a', fontSize: 19, fontWeight: '700' },
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
  camera: { ...StyleSheet.absoluteFill },
  cameraTopBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 18 : 18,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraIconButton: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.36)',
    paddingHorizontal: 12,
  },
  cameraIconButtonActive: { backgroundColor: 'rgba(255,255,255,0.24)' },
  cameraIconText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cameraTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scanOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '18%',
    alignItems: 'center',
  },
  scanFrame: {
    width: 228,
    height: 228,
  },
  scanCorner: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  scanCornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 22,
  },
  scanCornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 22,
  },
  scanCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 22,
  },
  scanCornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: 22,
  },
  scanHint: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 22,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowRadius: 8,
  },
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
