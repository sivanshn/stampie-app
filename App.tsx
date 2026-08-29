import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  ScrollView,
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
import {
  api,
  MAX_STAMPS_PER_BOOKING,
  type CardOption,
  type HandoutResponse,
} from './src/api'
import { tokenStore } from './src/storage'
import { PRIVACY_POLICY_URL, SUPPORT_URL } from './src/appLinks'

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
  const [showLegalAndHelp, setShowLegalAndHelp] = useState(false)

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
      {showLegalAndHelp ? (
        <LegalAndHelpScreen onBack={() => setShowLegalAndHelp(false)} />
      ) : screen.name === 'boot' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : screen.name === 'login' ? (
        <LoginScreen onLoggedIn={onLoggedIn} onShowLegalAndHelp={() => setShowLegalAndHelp(true)} />
      ) : screen.name === 'change' ? (
        <ChangePasswordScreen token={token!} onDone={onPasswordChanged} />
      ) : screen.name === 'home' ? (
        <HomeScreen
          orgName={screen.orgName}
          onLogout={onLogout}
          onStamp={() => setScreen({ name: 'scanner', orgName: screen.orgName })}
          onIssue={() => setScreen({ name: 'issue', orgName: screen.orgName })}
          onShowLegalAndHelp={() => setShowLegalAndHelp(true)}
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
  onShowLegalAndHelp,
}: {
  onLoggedIn: (token: string, mustChange: boolean) => void
  onShowLegalAndHelp: () => void
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
      <TouchableOpacity style={styles.legalLink} onPress={onShowLegalAndHelp}>
        <Text style={styles.legalLinkText}>Datenschutz &amp; Hilfe</Text>
      </TouchableOpacity>
    </View>
  )
}

/** Die Hinweise sind ohne Anmeldung erreichbar, wie Apple es für Datenschutz verlangt. */
function LegalAndHelpScreen({ onBack }: { onBack: () => void }) {
  const [linkError, setLinkError] = useState<string | null>(null)

  const open = async (url: string) => {
    setLinkError(null)
    try {
      const supported = await Linking.canOpenURL(url)
      if (!supported) throw new Error('unsupported')
      await Linking.openURL(url)
    } catch {
      setLinkError('Die Seite konnte nicht geöffnet werden. Bitte später erneut versuchen.')
    }
  }

  return (
    <View style={styles.legalWrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} accessibilityRole="button" accessibilityLabel="Zurück">
          <Text style={styles.headerAction}>‹ Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Datenschutz &amp; Hilfe</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.legalContent}>
        <Text style={styles.legalTitle}>Datenschutz auf einen Blick</Text>
        <Text style={styles.legalText}>
          Stampie ist eine Betriebs-App zum Ausgeben und Stempeln von Kundenkarten. Die
          Kamera wird ausschließlich zum Lesen von QR-Codes verwendet; die App speichert
          keine Kamerabilder oder Videos.
        </Text>
        <Text style={styles.legalText}>
          Für die Anmeldung verarbeitet Stampie die Zugangsdaten des Betriebs. Der
          Anmelde-Token wird geschützt auf diesem Gerät gespeichert. Beim Stempeln wird
          der gelesene QR-Code zur Buchung an den Stampie-Server übertragen.
        </Text>
        <Text style={styles.legalText}>
          Vollständige Angaben zu Verantwortlichen, Datenarten, Empfängern,
          Aufbewahrungsfristen sowie Auskunfts-, Berichtigungs- und Löschanfragen stehen
          in der öffentlichen Datenschutzerklärung.
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => void open(PRIVACY_POLICY_URL)}>
          <Text style={styles.buttonText}>Datenschutzerklärung öffnen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void open(SUPPORT_URL)}>
          <Text style={styles.secondaryButtonText}>Hilfe &amp; Support öffnen</Text>
        </TouchableOpacity>
        {linkError ? <Text style={styles.error}>{linkError}</Text> : null}
      </ScrollView>
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
  onShowLegalAndHelp,
}: {
  orgName: string
  onLogout: () => void
  onStamp: () => void
  onIssue: () => void
  onShowLegalAndHelp: () => void
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
      <TouchableOpacity style={styles.homeLegalLink} onPress={onShowLegalAndHelp}>
        <Text style={styles.legalLinkText}>Datenschutz &amp; Hilfe</Text>
      </TouchableOpacity>
    </View>
  )
}

/**
 * Was nach einem Scan gerade auf dem Schirm steht.
 *
 * Ein Scan ist kein einzelner Moment mehr: erst fragt die Kasse, wie viele Stempel es sein
 * sollen, dann bucht sie, dann steht die Antwort da, bis jemand entscheidet, ob es
 * weitergeht. Als Zustand ausgeschrieben, weil `Alert` weder eine Zahl abfragen noch zwei
 * gleichwertige Auswege anbieten kann.
 */
type ScanStage =
  | { name: 'scanning' }
  | { name: 'asking'; scanned: string }
  | { name: 'booking' }
  | { name: 'done'; kind: 'success' | 'error'; title: string; text: string }

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
  const [stage, setStage] = useState<ScanStage>({ name: 'scanning' })
  const [count, setCount] = useState(1)
  const [torchEnabled, setTorchEnabled] = useState(false)
  // Die Kamera feuert weiter, während React den Zustand setzt — der Riegel muss deshalb
  // sofort greifen und nicht erst beim nächsten Rendern.
  const locked = useRef(false)

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
  }, [permission, requestPermission])

  const backToScanning = () => {
    locked.current = false
    setCount(1)
    setStage({ name: 'scanning' })
  }

  const handleScan = ({ data }: { data: string }) => {
    if (locked.current) return
    locked.current = true
    setCount(1)
    setStage({ name: 'asking', scanned: data })
  }

  const book = async (scanned: string) => {
    const wanted = count
    setStage({ name: 'booking' })
    const res = await api.stamp(token, scanned, wanted)

    if (res.ok && res.data) {
      const { booked, stamps, stampGoal, completesCard } = res.data
      const gebucht = booked === 1 ? '1 Stempel' : `${booked} Stempel`
      // Am Ziel gedeckelt: was angefragt war, muss nicht sein, was gebucht wurde.
      const gekuerzt =
        booked < wanted ? `\n\nMehr passt nicht mehr auf die Karte.` : ''
      setStage({
        name: 'done',
        kind: 'success',
        title: completesCard ? 'Karte ist voll' : 'Gestempelt',
        text: completesCard
          ? `${gebucht} gebucht. Die Karte ist jetzt voll (${stamps}/${stampGoal}) — Belohnung einlösen.${gekuerzt}`
          : `${gebucht} gebucht (${stamps}/${stampGoal}).${gekuerzt}`,
      })
      return
    }

    const hint = refusalHint(res.code)
    setStage({
      name: 'done',
      kind: 'error',
      title: refusalTitle(res.code),
      text: `${res.error ?? 'Fehler beim Stempeln.'}${hint ? `\n\n${hint}` : ''}`,
    })
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

      <Modal
        visible={stage.name !== 'scanning'}
        transparent
        animationType="fade"
        onRequestClose={backToScanning}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            {stage.name === 'asking' ? (
              <StampCountStep
                count={count}
                onChange={setCount}
                onCancel={backToScanning}
                onConfirm={() => void book(stage.scanned)}
              />
            ) : stage.name === 'booking' ? (
              <View style={styles.sheetBusy}>
                <ActivityIndicator size="large" color="#1a1a1a" />
                <Text style={styles.sheetHint}>Wird gebucht …</Text>
              </View>
            ) : stage.name === 'done' ? (
              <>
                <View
                  style={[
                    styles.sheetBanner,
                    stage.kind === 'success' ? styles.feedbackOk : styles.feedbackErr,
                  ]}
                >
                  <Text style={styles.feedbackText}>{stage.title}</Text>
                </View>
                <Text style={styles.sheetText}>{stage.text}</Text>
                <TouchableOpacity style={styles.button} onPress={backToScanning}>
                  <Text style={styles.buttonText}>Weiter stempeln</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetGhostButton} onPress={onBack}>
                  <Text style={styles.sheetGhostText}>Zur Startseite</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}

/**
 * Die Frage nach der Anzahl, bevor gebucht wird.
 *
 * Eins ist voreingestellt, weil das der Normalfall an der Kasse ist — wer nur bestätigt,
 * bekommt genau den. Die Obergrenze ist dieselbe wie auf dem Server; mehr ist ein
 * Vertipper, kein Wunsch.
 */
function StampCountStep({
  count,
  onChange,
  onCancel,
  onConfirm,
}: {
  count: number
  onChange: (next: number) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <>
      <Text style={styles.sheetTitle}>Wie viele Stempel?</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.stepperButton, count <= 1 && styles.buttonDisabled]}
          disabled={count <= 1}
          onPress={() => onChange(count - 1)}
        >
          <Text style={styles.stepperButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{count}</Text>
        <TouchableOpacity
          style={[styles.stepperButton, count >= MAX_STAMPS_PER_BOOKING && styles.buttonDisabled]}
          disabled={count >= MAX_STAMPS_PER_BOOKING}
          onPress={() => onChange(count + 1)}
        >
          <Text style={styles.stepperButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={onConfirm}>
        <Text style={styles.buttonText}>{count === 1 ? 'Stempeln' : `${count} Stempel buchen`}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.sheetGhostButton} onPress={onCancel}>
        <Text style={styles.sheetGhostText}>Abbrechen</Text>
      </TouchableOpacity>
    </>
  )
}

/**
 * Karte an einen neuen Kunden ausgeben.
 *
 * Ein Betrieb kann mehrere Programme führen — Kaffee, Gebäck, Wäsche —, deshalb steht am
 * Anfang die Auswahl, welche Karte der Kunde bekommen soll. Danach steht ihr Ausgabe-QR
 * auf dem Schirm, den der Kunde mit der Kamera scannt.
 *
 * Der QR zeigt bewusst auf `/k/<code>` und nicht auf einen fertigen Pass: erst diese Seite
 * baut dem scannenden Telefon seine eigene Karte und bietet Apple und Google Wallet an.
 * Ein zweiter Scan vom selben Telefon liefert dieselbe Karte wieder, keine zweite mit null
 * Stempeln — deshalb darf derselbe QR den ganzen Tag stehen bleiben.
 */
function IssueScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [cards, setCards] = useState<CardOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [handout, setHandout] = useState<HandoutResponse | null>(null)

  const loadCards = useCallback(async () => {
    const res = await api.listCards(token)
    if (!res.ok || !res.data) {
      setError(res.error ?? 'Karten konnten nicht geladen werden.')
      return
    }
    setCards(res.data.cards)
  }, [token])

  useEffect(() => {
    void loadCards()
  }, [loadCards])

  const show = async (card: CardOption) => {
    setBusyId(card.id)
    setError(null)
    const res = await api.issueCard(token, card.id)
    setBusyId(null)
    if (!res.ok || !res.data) {
      // Die Karte wurde gelöscht, während die Liste hier noch stand: Liste nachziehen,
      // damit der nächste Griff nicht wieder danebengeht.
      if (res.code === 'not_found') await loadCards()
      return setError(res.error ?? 'Ausgeben fehlgeschlagen.')
    }
    setHandout(res.data)
  }

  return (
    <View style={styles.issueWrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handout ? () => setHandout(null) : onBack}>
          <Text style={styles.headerAction}>‹ Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{handout ? handout.cardName : 'Karte ausgeben'}</Text>
        <View style={{ width: 60 }} />
      </View>

      {handout ? (
        <View style={styles.qrBox}>
          <Text style={styles.qrHint}>Vom Kunden scannen lassen:</Text>
          <View style={styles.qrCard}>
            <QRCode value={handout.url} size={220} />
          </View>
          <Text style={styles.qrCaption}>
            Der Kunde legt die Karte damit selbst in sein Wallet — {handout.stampGoal} Stempel bis
            zur Belohnung. Der Code bleibt gültig, er kann für den nächsten Kunden stehen bleiben.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => setHandout(null)}>
            <Text style={styles.buttonText}>Andere Karte wählen</Text>
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
              style={[styles.cardRow, !c.isPublished && styles.cardRowMuted]}
              disabled={busyId !== null}
              onPress={() => void show(c)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName}>{c.programName}</Text>
                <Text style={styles.cardMeta}>
                  {c.isPublished
                    ? `Ziel: ${c.stampGoal} Stempel`
                    : 'Entwurf — erst veröffentlichen'}
                </Text>
              </View>
              {busyId === c.id ? (
                <ActivityIndicator color="#1a1a1a" />
              ) : (
                <Text style={styles.plus}>›</Text>
              )}
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
  legalWrap: { flex: 1, backgroundColor: '#f5f5f4' },
  legalContent: { padding: 24, gap: 14, paddingBottom: 40 },
  legalTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  legalText: { fontSize: 16, lineHeight: 23, color: '#444' },
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
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#1a1a1a', fontSize: 16, fontWeight: '600' },
  legalLink: { alignItems: 'center', paddingVertical: 8 },
  legalLinkText: { color: '#555', fontSize: 14, textDecorationLine: 'underline' },
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
  homeLegalLink: { alignItems: 'center', paddingVertical: 8 },
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 34,
    gap: 12,
  },
  sheetBusy: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  sheetText: { fontSize: 16, lineHeight: 22, color: '#1a1a1a', textAlign: 'center' },
  sheetHint: { fontSize: 15, color: '#555' },
  sheetBanner: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 },
  sheetGhostButton: { alignItems: 'center', paddingVertical: 12 },
  sheetGhostText: { fontSize: 16, fontWeight: '600', color: '#555' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
  },
  stepperButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0efed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 30, fontWeight: '700', color: '#1a1a1a' },
  stepperValue: {
    fontSize: 44,
    fontWeight: '700',
    color: '#1a1a1a',
    minWidth: 60,
    textAlign: 'center',
  },
  cardRowMuted: { opacity: 0.55 },
  qrCaption: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  feedbackOk: { backgroundColor: '#1e8e3e' },
  feedbackErr: { backgroundColor: '#c0392b' },
  feedbackText: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
})
