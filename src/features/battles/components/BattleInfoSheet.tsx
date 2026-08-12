import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { HomeColors } from "@/features/home/home-theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Qué es una batalla y por qué puntúa como puntúa.
 *
 * Existe por una confusión concreta y previsible: quien entrena más días puede
 * perder, y sin explicación eso se lee como un fallo. El ejemplo del final es
 * la pieza importante de esta hoja; lo demás es contexto.
 */
export function BattleInfoSheet({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <Text style={styles.title}>Cómo funcionan las batallas</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            hitSlop={10}
            style={styles.close}
            accessibilityLabel="Cerrar"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={18}
              color={HomeColors.text}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>
            Compites con tus amigos durante una o varias semanas. Gana quien
            mejor cumpla <Text style={styles.bold}>su propio plan</Text>, no
            quien más peso levante.
          </Text>

          {/* Lo práctico primero: quien abre esto sin haber creado ninguna
              batalla necesita saber cómo se juega, no la filosofía. La
              puntuación va después, que es lo que se viene a mirar cuando ya
              hay una en marcha y no se entiende el marcador. */}
          <Section title="Cómo se juega">
            <Bullet text="Creas una batalla y compartes su código de 6 caracteres." />
            <Bullet text="Hasta 8 personas, y solo una batalla a la vez." />
            <Bullet text="Al empezar se cierra la entrada: nadie se suma a mitad." />
            <Bullet text="Cuando termina el plazo se cierra sola y se avisa a todos." />
          </Section>

          <Section title="Por qué no se comparan los kilos">
            <Text style={styles.text}>
              Comparar pesos entre personas compara biología, no esfuerzo:
              alguien de 90 kg levanta más que alguien de 55 kg casi siempre. Y
              contar el volumen total premiaría a quien tiene más tiempo libre.
            </Text>
            <Text style={styles.text}>
              Por eso todo se mide contra ti mismo. Así compiten de igual a
              igual un principiante y un veterano, o alguien que quiere ganar
              músculo y alguien que quiere perder grasa.
            </Text>
          </Section>

          <Section title="Cómo se puntúa">
            <Rule
              points="hasta 1000"
              label="Cumplir tu plan"
              detail="Sesiones que haces entre las que te tocaban. Es lo que más pesa, con diferencia."
            />
            <Rule
              points="50"
              label="Cada marca personal"
              detail="Superar el mejor peso que tenías ANTES de empezar la batalla, en cualquier ejercicio. Máximo 300."
            />
            <Rule points="75" label="Cada logro que desbloquees" />
            <Rule
              points="15"
              label="Cada día que entrenas"
              detail="Suma aparte de lo anterior a propósito: como cumplir tu plan topa en 1000, esto es lo único que premia pasarte de tu objetivo."
            />
            <Text style={styles.text}>
              Si dos acabáis con los mismos puntos, queda por delante quien haya
              hecho más sesiones.
            </Text>
          </Section>

          <Section title="El ejemplo que lo explica todo">
            <View style={styles.example}>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleWho}>Laura entrena 3 días</Text>
                <Text style={styles.exampleDone}>hace 3</Text>
                <Text style={styles.exampleWin}>1000</Text>
              </View>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleWho}>Tú entrenas 5 días</Text>
                <Text style={styles.exampleDone}>haces 4</Text>
                <Text style={styles.exampleLose}>800</Text>
              </View>
            </View>

            <Text style={styles.text}>
              Gana Laura, aunque tú hayas entrenado un día más que ella. No es
              un fallo: ella cumplió su plan entero y tú te dejaste uno. Lo que
              se premia es la constancia con lo que cada uno se propone.
            </Text>
            <Text style={styles.aside}>
              Son solo los puntos por cumplir el plan. A los dos se les sumarían
              además los días entrenados, las marcas y los logros.
            </Text>
          </Section>

          <Section title="De dónde sale tu objetivo">
            <Text style={styles.text}>
              De los días que dices que entrenas en tu perfil, corregidos con lo
              que de verdad has entrenado las últimas 4 semanas. Se fija al
              empezar la batalla y ya no cambia, así que tocar el perfil a mitad
              no sirve de nada.
            </Text>
          </Section>

          <Section title="Qué ven los demás">
            <Text style={styles.text}>
              Solo tus puntos y cuántas sesiones has hecho de las que te
              tocaban. Nunca tus pesos, tus ejercicios, tu peso corporal ni tus
              lesiones.
            </Text>
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Rule({
  points,
  label,
  detail,
}: {
  points: string;
  label: string;
  detail?: string;
}) {
  return (
    <View style={styles.rule}>
      <View style={styles.rulePoints}>
        <Text style={styles.rulePointsText}>{points}</Text>
      </View>

      <View style={styles.ruleCopy}>
        <Text style={styles.ruleLabel}>{label}</Text>
        {detail && <Text style={styles.ruleDetail}>{detail}</Text>}
      </View>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.dot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  sheet: {
    marginTop: "auto",
    maxHeight: "88%",
    backgroundColor: HomeColors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: HomeColors.border,
  },

  grabber: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: HomeColors.border,
  },

  header: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    color: HomeColors.text,
  },

  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: HomeColors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  body: { marginTop: 16 },
  bodyContent: { paddingBottom: 20 },

  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: HomeColors.text,
  },

  bold: { fontWeight: "700", color: HomeColors.primary },

  section: { marginTop: 24, gap: 10 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: HomeColors.primary,
  },

  text: {
    fontSize: 14,
    lineHeight: 21,
    color: HomeColors.textSecondary,
  },

  // La letra pequeña del ejemplo: matiza sin competir con la explicación.
  aside: {
    fontSize: 12,
    lineHeight: 18,
    color: HomeColors.textTertiary,
  },

  rule: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  rulePoints: {
    minWidth: 74,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: HomeColors.primarySoft,
    alignItems: "center",
  },

  rulePointsText: {
    fontSize: 12,
    fontWeight: "800",
    color: HomeColors.primary,
    fontVariant: ["tabular-nums"],
  },

  ruleCopy: { flex: 1 },
  ruleLabel: { fontSize: 14, fontWeight: "600", color: HomeColors.text },
  ruleDetail: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: HomeColors.textTertiary,
  },

  example: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: HomeColors.surface,
    gap: 10,
  },

  exampleRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  exampleWho: { flex: 1, fontSize: 13, color: HomeColors.text },
  exampleDone: { fontSize: 12, color: HomeColors.textSecondary },

  exampleWin: {
    minWidth: 46,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "800",
    color: HomeColors.primary,
    fontVariant: ["tabular-nums"],
  },

  exampleLose: {
    minWidth: 46,
    textAlign: "right",
    fontSize: 16,
    fontWeight: "800",
    color: HomeColors.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  bullet: { flexDirection: "row", alignItems: "flex-start", gap: 10 },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
    backgroundColor: HomeColors.primary,
  },

  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: HomeColors.textSecondary,
  },
});
