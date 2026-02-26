import { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

// ─────────────────────────────────────────────────────────────────────────────
// QRScannerModal
//
// Full-screen camera modal that:
//  1. Requests camera permission if not yet granted
//  2. Scans for QR codes using expo-camera's CameraView
//  3. Sends the scanned token to POST /users/identify-loyalty
//  4. If a phone number comes back, enriches with loyalty stats via
//     GET /loyalty/lookup/:phone (points, discount tier, visit count)
//  5. Calls onCustomerFound(customer) and closes itself
//
// The parent passes identifyLoyalty + lookupLoyaltyCustomer from api.ts
// to keep this component free of direct API imports.
// ─────────────────────────────────────────────────────────────────────────────

export interface ScannedCustomer {
  id: string;
  name: string;
  phone: string;
  points: number;
  discount: number;
  visits: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onCustomerFound: (customer: ScannedCustomer) => void;
  identifyLoyalty: (token: string) => Promise<any>;
  lookupLoyaltyCustomer: (phone: string) => Promise<any>;
  lookupUserLoyalty: (phone: string) => Promise<any>;
}

export default function QRScannerModal({
  visible, onClose, onCustomerFound, identifyLoyalty, lookupLoyaltyCustomer, lookupUserLoyalty,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Ref prevents duplicate API calls when camera fires onBarcodeScanned rapidly
  const cooldownRef = useRef(false);

  // Reset state every time the modal opens
  useEffect(() => {
    if (visible) {
      setProcessing(false);
      setErrorMsg(null);
      cooldownRef.current = false;
    }
  }, [visible]);

  // Detect if scanned value looks like a phone number (digits, +, spaces, dashes)
  const looksLikePhone = (val: string) => /^[+\d][\d\s\-().]{6,}$/.test(val.trim());

  const handleScanned = async ({ data: scanned }: BarcodeScanningResult) => {
    if (cooldownRef.current || processing) return;
    cooldownRef.current = true;
    setProcessing(true);
    setErrorMsg(null);

    // Debug: log exactly what the QR contains so we can see what path is taken
    console.log('📷 QR scanned:', JSON.stringify(scanned), '| length:', scanned.length, '| looksLikePhone:', looksLikePhone(scanned));

    try {
      let customer: ScannedCustomer | null = null;

      if (looksLikePhone(scanned)) {
        // ── PATH A: QR contains a phone number (old-format card or fallback) ──
        // Skip identify-loyalty and go straight to lookup
        const phone = scanned.trim();
        const loyRes = await lookupLoyaltyCustomer(phone);
        const c = loyRes.data?.customer;
        if (!c) throw new Error('no_customer');
        customer = {
          id:       c.id       ?? '',
          name:     c.name     ?? phone,
          phone:    c.phone    ?? phone,
          points:   c.points   ?? 0,
          discount: c.discount ?? 0,
          visits:   c.visits   ?? 0,
        };
      } else {
        // ── PATH B: QR contains an encrypted loyalty token ──
        // Step 1: decrypt token → get basic user profile
        const identRes = await identifyLoyalty(scanned);
        const user = identRes.data?.data?.user;
        if (!user) throw new Error('no_user');

        // id is intentionally empty — app Users live in the User table, not
        // the Customer table. Sending User.id as TableSession.customerId would
        // cause a foreign-key error. The discount is passed as a plain number.
        customer = {
          id:       '',
          name:     `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
          phone:    user.phone ?? '',
          points:   0,
          discount: 0,
          visits:   0,
        };

        // Step 2: fetch real loyalty data from LoyaltyReward (app-user system)
        if (user.phone) {
          try {
            const loyRes = await lookupUserLoyalty(user.phone);
            const u = loyRes.data?.user;
            if (u) {
              customer = {
                id:       '',
                name:     u.name     ?? customer.name,
                phone:    u.phone    ?? user.phone,
                points:   u.points   ?? 0,
                discount: u.discount ?? 0,
                visits:   0,
              };
            }
          } catch {
            // Non-fatal — show customer name without loyalty stats
          }
        }
      }

      onCustomerFound(customer);
    } catch (err: any) {
      const serverMsg: string = err?.response?.data?.message ?? '';
      let display: string;
      if (serverMsg === 'Token has expired') {
        display = 'QR code expired — ask the customer to refresh their card.';
      } else if (serverMsg === 'no_customer' || err?.message === 'no_customer') {
        display = 'No loyalty account found for this QR code.';
      } else {
        display = serverMsg || 'Could not read this QR code. Try the customer\'s phone number instead.';
      }

      setErrorMsg(display);
      setProcessing(false);

      // Allow a retry after 3 s
      setTimeout(() => {
        setErrorMsg(null);
        cooldownRef.current = false;
      }, 3000);
    }
  };

  // Not yet determined — render nothing (modal isn't open yet anyway)
  if (!permission) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.root}>

        {/* ── PERMISSION SCREEN ── */}
        {!permission.granted ? (
          <View style={s.permScreen}>
            <Text style={s.permEmoji}>📷</Text>
            <Text style={s.permTitle}>Camera access needed</Text>
            <Text style={s.permBody}>
              The camera is used to scan the customer's loyalty QR code.
            </Text>
            <TouchableOpacity style={s.grantBtn} onPress={requestPermission}>
              <Text style={s.grantBtnText}>Grant Camera Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelLink} onPress={onClose}>
              <Text style={s.cancelLinkText}>Cancel — enter phone instead</Text>
            </TouchableOpacity>
          </View>

        ) : (
          /* ── LIVE CAMERA ── */
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={processing ? undefined : handleScanned}
            />

            {/* Semi-transparent overlay with viewfinder cut-out */}
            <View style={s.overlay} pointerEvents="box-none">

              {/* Top bar */}
              <View style={s.topBar}>
                <View style={{ flex: 1 }}>
                  <Text style={s.topTitle}>📷 Scan Loyalty QR Code</Text>
                  <Text style={s.topSub}>Customer opens their app → Loyalty Card → show QR</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Middle: shade | transparent viewfinder | shade */}
              <View style={s.middle}>
                <View style={s.shade} />
                <View style={s.viewfinder}>
                  <View style={[s.corner, s.cTL]} />
                  <View style={[s.corner, s.cTR]} />
                  <View style={[s.corner, s.cBL]} />
                  <View style={[s.corner, s.cBR]} />
                </View>
                <View style={s.shade} />
              </View>

              {/* Bottom status bar */}
              <View style={s.bottomBar}>
                {processing ? (
                  <View style={s.statusRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={s.statusText}>Reading card…</Text>
                  </View>
                ) : errorMsg ? (
                  <View style={s.errorBox}>
                    <Text style={s.errorText}>⚠️  {errorMsg}</Text>
                    <Text style={s.errorHint}>Point the camera at the QR code again to retry</Text>
                  </View>
                ) : (
                  <Text style={s.hintText}>
                    Hold the QR code steady inside the frame
                  </Text>
                )}
              </View>

            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const VF   = 240; // viewfinder square size
const CW   = 22;  // corner arm length
const CT   = 3;   // corner border thickness
const INDIGO = '#4F46E5';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Permission screen
  permScreen:   { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', padding: 32 },
  permEmoji:    { fontSize: 64, marginBottom: 20 },
  permTitle:    { fontSize: 20, fontWeight: '800', color: '#F9FAFB', marginBottom: 10, textAlign: 'center' },
  permBody:     { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  grantBtn:     { backgroundColor: INDIGO, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 15, marginBottom: 14 },
  grantBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelLink:   { padding: 12 },
  cancelLinkText: { color: '#6B7280', fontSize: 14 },

  // Camera overlay
  overlay:  { flex: 1 },
  topBar:   {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingTop:  Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 18, paddingHorizontal: 20,
  },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  topSub:   { color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 17 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  closeBtnText: { color: '#fff', fontSize: 18 },

  middle:     { flex: 1, flexDirection: 'row' },
  shade:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.68)' },
  viewfinder: { width: VF, height: VF },   // transparent — camera shows through

  // Corner markers
  corner: { position: 'absolute', width: CW, height: CW, borderColor: INDIGO },
  cTL: { top: 0, left: 0,  borderTopWidth: CT,    borderLeftWidth: CT },
  cTR: { top: 0, right: 0, borderTopWidth: CT,    borderRightWidth: CT },
  cBL: { bottom: 0, left: 0,  borderBottomWidth: CT, borderLeftWidth: CT },
  cBR: { bottom: 0, right: 0, borderBottomWidth: CT, borderRightWidth: CT },

  bottomBar: { backgroundColor: 'rgba(0,0,0,0.72)', minHeight: 110, paddingVertical: 24, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  hintText:   { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorBox:   { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 10, borderWidth: 1, borderColor: '#EF4444', padding: 14, alignItems: 'center' },
  errorText:  { color: '#FCA5A5', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  errorHint:  { color: 'rgba(252,165,165,0.7)', fontSize: 12, textAlign: 'center' },
});
